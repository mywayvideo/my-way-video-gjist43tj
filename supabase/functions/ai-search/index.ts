import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

function extractJson(
  text: string,
  fallbackMessage: string = 'Desculpe, ocorreu um erro técnico ao processar os dados. Por favor, entre em contato com um especialista.',
): any {
  if (!text || !text.trim()) {
    return {
      message: fallbackMessage,
      confidence_level: 'low',
      should_show_whatsapp_button: true,
      referenced_internal_products: [],
    }
  }
  try {
    const match = text.match(/\{[\s\S]*?\}/)
    if (match) {
      return JSON.parse(match[0])
    }
    throw new Error('No JSON object found')
  } catch (e: any) {
    console.error('Failed to parse JSON:', e.stack || e)
    console.log('FAILED TO PARSE CONTENT:', text)
    return {
      message: fallbackMessage,
      confidence_level: 'low',
      should_show_whatsapp_button: true,
      referenced_internal_products: [],
    }
  }
}

function getFallbackMessage(query: string): string {
  const lowerQuery = query.toLowerCase()
  if (lowerQuery.match(/\b(the|is|what|how|why|where|can|you|please|help)\b/)) {
    return "I'm sorry, a technical error occurred while processing the data. Please contact a specialist."
  }
  if (lowerQuery.match(/\b(el|la|qué|como|por qué|donde|puedes|por favor|ayuda)\b/)) {
    return 'Lo siento, ocurrió un error técnico al procesar los datos. Por favor, contacte a un especialista.'
  }
  if (lowerQuery.match(/\b(le|la|les|quoi|comment|pourquoi|où|pouvez|s'il vous plaît|aide)\b/)) {
    return "Désolé, une erreur technique s'est produite lors du traitement des données. Veuillez contacter un spécialiste."
  }
  return 'Desculpe, ocorreu um erro técnico ao processar os dados. Por favor, entre em contato com um especialista.'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('FUNCTION_START: Received request')

  try {
    const supUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const supabase = createClient(supUrl, serviceRoleKey)

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    let userId = null

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const user = await supabase.auth.getUser(token)
        userId = user.data.user?.id || null
      } catch (e) {}
    }

    const bodyText = await req.text()
    let query = ''
    let sessionId = undefined
    let history: any[] = []
    let userName = 'Usuário'
    let productName = 'Não informado'
    let technicalInfo = 'Não informado'
    let currentProductId = null
    let isAdmin = false

    try {
      const parsed = JSON.parse(bodyText)
      query = parsed.query || bodyText
      sessionId = parsed.session_id
      history = parsed.history || []
      userName = parsed.userName || userName
      productName = parsed.productName || productName
      technicalInfo = parsed.technicalInfo || technicalInfo
      currentProductId = parsed.currentProductId || null
      isAdmin = !!parsed.isAdmin
    } catch {
      query = bodyText
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('Query is required')
    }

    let actualQuery = query
    const userQueryMatch = query.match(/User Query: (.*)/)
    if (userQueryMatch) {
      actualQuery = userQueryMatch[1]
    }

    const fallbackMessage = getFallbackMessage(actualQuery)

    const hasProductContext = productName && productName !== 'Não informado'

    if (!isAdmin && !hasProductContext) {
      try {
        const { data: cacheData, error: cacheError } = await supabase
          .from('product_search_cache')
          .select('product_specs')
          .eq('search_query', actualQuery)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!cacheError && cacheData && cacheData.product_specs) {
          const specs =
            typeof cacheData.product_specs === 'string'
              ? JSON.parse(cacheData.product_specs)
              : cacheData.product_specs
          if (
            specs &&
            Array.isArray(specs.referenced_internal_products) &&
            specs.referenced_internal_products.length > 0
          ) {
            console.log('FUNCTION_END: Returning cached result')
            return new Response(JSON.stringify(specs), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          }
        }
      } catch (e) {
        console.error('Cache read error:', e)
      }
    }

    // --- INÍCIO DA SOBERANIA ABSOLUTA MY WAY (V38) ---
    // 1. Busca Coordenada (Mapeamento Real de Campos)
    const [agentRes, aiRes, globalRes, mfgRes, compRes, providersRes] = await Promise.all([
      supabase
        .from('ai_agent_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('ai_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase.from('settings').select('key, value'),
      supabase.from('manufacturers').select('name'),
      supabase.from('company_info').select('content, type'),
      supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority_order', { ascending: true }),
    ])

    const globalSettingsMap: Record<string, string> = {}
    globalRes.data?.forEach((s: any) => {
      if (s.value) globalSettingsMap[s.key] = s.value
    })

    const mfgList = mfgRes.data?.map((m: any) => m.name).join(', ') || ''

    // Filtra o Contexto Institucional da tabela company_info (type: ai_knowledge)
    const institutionalContext =
      compRes.data?.find((c: any) => c.type === 'ai_knowledge')?.content || ''

    const providers = providersRes.data
    if (!providers?.length) throw new Error('No active providers found')

    // 2. Consolidação Fiel (Sem chutes, apenas dados reais)
    const settings = {
      persona: agentRes.data?.system_prompt,
      template: aiRes.data?.system_prompt_template,
      logistics: aiRes.data?.logistics_rules_prompt,
      priceLimit: aiRes.data?.price_threshold_usd,
      productPage: aiRes.data?.product_page_prompt,
      proactivity: agentRes.data?.proactivity_level,
      stopWords: aiRes.data?.custom_stop_words,
      transparencyNote: globalSettingsMap['transparency_note'],
      trigger_keywords: aiRes.data?.trigger_keywords || [],
      whatsapp_trigger_expensive: aiRes.data?.whatsapp_trigger_expensive,
      whatsapp_trigger_low_confidence: aiRes.data?.whatsapp_trigger_low_confidence,
      confidence_threshold: aiRes.data?.confidence_threshold || 'low',
    }

    // 3. Fusão de Identidade (Garante que a Persona entre no Template)
    // LOG DE DEPURAÇÃO - Verifique isso no console do Supabase
    console.log('DEBUG - Persona:', settings.persona?.substring(0, 50))
    console.log('DEBUG - Template:', settings.template?.substring(0, 50))
    console.log('DEBUG - Logistics:', settings.logistics?.substring(0, 50))
    console.log('DEBUG - Institutional:', institutionalContext?.substring(0, 50))

    const finalBasePrompt = settings.template?.includes('{{system_prompt}}')
      ? settings.template.replace('{{system_prompt}}', settings.persona || '')
      : `${settings.persona || ''}\n\n${settings.template || ''}`

    console.log('DEBUG - Final Prompt Length:', finalBasePrompt.length)

    // 4. Segurança e Tom
    const currentProactivity = settings.proactivity ?? 5
    const tonePrompt =
      currentProactivity >= 7
        ? `\nESTILO DE RESPOSTA (NÍVEL ${currentProactivity}): Consultor Ativo e Vendedor. Sugira proativamente soluções completas.`
        : `\nESTILO DE RESPOSTA (NÍVEL ${currentProactivity}): Consultor Reativo. Responda estritamente o que foi perguntado.`

    // 5. Prompt Mestre de Autoridade
    const sysPrompt = `### MANDATORY OPERATIONAL RULES: HIGHEST AUTHORITY ###
1. PERSONA & DOCTRINE (CORE IDENTITY):
${finalBasePrompt}

2. LOGISTICS & SHIPPING RULES (MANDATORY):
${settings.logistics}

3. INSTITUTIONAL CONTEXT (MY WAY AUTHORITY):
${institutionalContext}

### DATA & BEHAVIOR CONTEXT ###
FABRICANTES HOMOLOGADOS: ${mfgList}
STOP WORDS: ${settings.stopWords}
${tonePrompt}

### EXECUTION DIRECTIVES ###
- You MUST follow the Persona, Logistics, and Doctrine above.
- If prices are empty, set confidence_level to low.
- SOBERANIA DE DADOS: Database is the ONLY truth. NEVER fabricate prices.
- FORMAT: Return ONLY RAW JSON. Include the MANDATORY FOOTER in 'message'.`
    // --- FIM DA SOBERANIA ABSOLUTA MY WAY ---

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description:
            'Search for products AND Market Intelligence (benchmarks, trends, event news, and comparisons). Use this tool for ANY technical or strategic query.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search terms based on manufacturers and user request',
              },
            },
            required: ['query'],
          },
        },
      },
    ]
    let result: any = null
    let allowedProductIds = new Set<string>()
    let allReturnedProducts: any[] = []
    let hasExpensiveProduct = false

    for (const p of providers) {
      const key = Deno.env.get(p.api_key_secret_name)
      if (!key) continue

      try {
        console.log('--- START PROVIDER ATTEMPT: ' + p.provider_name + ' ---')

        let url = 'https://api.openai.com/v1/chat/completions'
        let headers: any = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

        const providerLower = (p.provider_name || '').toLowerCase()
        if (providerLower.includes('claude') || providerLower.includes('anthropic')) {
          url = 'https://api.anthropic.com/v1/messages'
          headers = {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          }
        } else if (p.provider_name === 'deepseek') {
          url = 'https://api.deepseek.com/chat/completions'
        } else if (p.provider_name === 'gemini') {
          url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
        }

        let msgs: any[] = [{ role: 'system', content: sysPrompt }]
        if (Array.isArray(history) && history.length > 0) {
          const cleanHistory = history.filter(
            (h) =>
              typeof h.content === 'string' && !h.content.toLowerCase().includes('erro técnico'),
          )
          msgs.push(...cleanHistory.slice(-6))
        }
        msgs.push({ role: 'user', content: actualQuery })

        let calls = 0
        let finalResponseObtained = false
        let hasCalledSearchProducts = false

        while (calls <= 2) {
          const payload: any = {
            model: p.model_id,
            messages: msgs,
            response_format: { type: 'json_object' },
          }

          if (calls === 0) {
            payload.tools = tools
            payload.tool_choice = 'auto'
          } else {
            payload.tools = tools
          }

          console.log('Attempting provider: ' + p.provider_name)
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          })

          if (res.status === 401 || res.status === 403) {
            console.error(
              `Provider ${p.provider_name} returned ${res.status}. Moving to next provider.`,
            )
            break
          }

          if (!res.ok) throw new Error(await res.text())

          const resData = await res.json()
          if (calls === 0) {
            console.log('RAW AI RESPONSE (Turn 1):', JSON.stringify(resData))
          }
          const msg = resData.choices?.[0]?.message
          const finishReason = resData.choices?.[0]?.finish_reason

          if (msg?.tool_calls) {
            msgs.push(msg)
            for (const t of msg.tool_calls) {
              if (t.function.name === 'search_products') {
                hasCalledSearchProducts = true
                console.log('TOOL CALL ARGS:', t.function.arguments)
                const args = JSON.parse(t.function.arguments || '{}')

                console.log('Iniciando busca profunda MY WAY... Analisando termo técnico.')
                let rpcData: any = { stock: [], intel: [], nab_data: [] }
                try {
                  const queryStr = args.query || actualQuery
                  console.log('Tier 1: Consultando base de dados e estoque imediato...')
                  const { data: data1, error: error1 } = await supabase.rpc('execute_ai_search', {
                    search_term: queryStr,
                  })

                  let mergedStockMap = new Map<string, any>()

                  if (!error1 && data1 && (data1 as any).stock && (data1 as any).stock.length > 0) {
                    ;(data1 as any).stock.forEach((p: any) => mergedStockMap.set(p.id, p))
                    rpcData.intel = (data1 as any).intel || []
                    rpcData.nab_data = (data1 as any).nab_data || []
                  } else {
                    console.log('Tier 2-4: Refinando busca por modelos e variações técnicas...')
                    const queryWords = queryStr
                      .trim()
                      .split(/\s+/)
                      .filter((w: string) => w.length > 2)
                    const word2 = queryWords[1]
                    const word3 = queryWords[2]

                    if (word2) {
                      const { data: data2, error: error2 } = await supabase.rpc(
                        'execute_ai_search',
                        { search_term: word2 },
                      )
                      if (!error2 && data2 && (data2 as any).stock) {
                        ;(data2 as any).stock.forEach((p: any) => mergedStockMap.set(p.id, p))
                        if (rpcData.intel.length === 0) rpcData.intel = (data2 as any).intel || []
                        if (rpcData.nab_data.length === 0)
                          rpcData.nab_data = (data2 as any).nab_data || []
                      }
                    }

                    if (word3) {
                      const { data: data3, error: error3 } = await supabase.rpc(
                        'execute_ai_search',
                        { search_term: word3 },
                      )
                      if (!error3 && data3 && (data3 as any).stock) {
                        ;(data3 as any).stock.forEach((p: any) => mergedStockMap.set(p.id, p))
                        if (rpcData.intel.length === 0) rpcData.intel = (data3 as any).intel || []
                        if (rpcData.nab_data.length === 0)
                          rpcData.nab_data = (data3 as any).nab_data || []
                      }
                    }

                    if (word2 && word3) {
                      const combined = `${word2} ${word3}`
                      const { data: data4, error: error4 } = await supabase.rpc(
                        'execute_ai_search',
                        { search_term: combined },
                      )
                      if (!error4 && data4 && (data4 as any).stock) {
                        ;(data4 as any).stock.forEach((p: any) => mergedStockMap.set(p.id, p))
                        if (rpcData.intel.length === 0) rpcData.intel = (data4 as any).intel || []
                        if (rpcData.nab_data.length === 0)
                          rpcData.nab_data = (data4 as any).nab_data || []
                      }
                    }
                  }
                  console.log('Soberania de Dados: Validando preços e SKUs oficiais MY WAY...')
                  rpcData.stock = Array.from(mergedStockMap.values()).sort((a: any, b: any) => {
                    const scoreA = a.relevance_score || 0
                    const scoreB = b.relevance_score || 0
                    if (scoreA !== scoreB) return scoreB - scoreA
                    const priceA = a.price_usd || 0
                    const priceB = b.price_usd || 0
                    return priceB - priceA
                  })
                } catch (dbErr: any) {
                  console.error('Database search error:', dbErr.stack || dbErr)
                }

                console.log('DATABASE RPC RESULT (Count):', rpcData?.stock?.length || 0)

                let filteredStock = (rpcData?.stock || []).slice(0, 15)

                filteredStock.forEach((p: any) => {
                  if (p.id) {
                    allowedProductIds.add(p.id)
                    if (!allReturnedProducts.some((existing) => existing.id === p.id)) {
                      allReturnedProducts.push(p)
                    }
                  }
                  if (p.price_usd && p.price_usd > settings.priceLimit) {
                    hasExpensiveProduct = true
                  }
                })

                let content = JSON.stringify({
                  stock: filteredStock.map((prod: any) => ({
                    id: prod.id,
                    name: prod.name,
                    sku: prod.sku,
                    price_usd: prod.price_usd,
                    manufacturer_name: prod.manufacturer_name,
                    ncm: prod.ncm,
                  })),
                  intel: (rpcData?.intel || []).slice(0, 2),
                  nab_data: (rpcData?.nab_data || []).slice(0, 2),
                })

                msgs.push({ role: 'tool', tool_call_id: t.id, name: t.function.name, content })
              }
            }
            // REFORÇO DE DOUTRINA (V42) - Mantém a Persona e as Regras da Empresa
            msgs.push({
              role: 'system',
              content: `Data received. You are the My Way Senior Technical Consultant. 
              Synthesize the final response in Portuguese (PT-BR) following the Persona, Logistics, 
              and Mandatory JSON Structure defined in the original instructions. 
              Do not deviate from your specialized identity.`,
            })
            calls++
          } else {
            const extracted = extractJson(msg?.content || '', fallbackMessage)

            const contentLower = (msg?.content || '').toLowerCase()
            const hasSemanticViolations =
              contentLower.includes('especifica') ||
              contentLower.includes('estoque') ||
              contentLower.includes('não encontrado') ||
              contentLower.includes('out of stock') ||
              contentLower.includes('disponív') ||
              contentLower.includes('resolução') ||
              contentLower.includes('sensor') ||
              contentLower.includes('peso') ||
              contentLower.includes('dimensões') ||
              contentLower.includes('preço') ||
              contentLower.includes('$') ||
              contentLower.includes('r$') ||
              contentLower.includes('modelo')

            const providedIds = Array.isArray(extracted.referenced_internal_products)
              ? extracted.referenced_internal_products
              : []

            if (!hasCalledSearchProducts && (hasSemanticViolations || providedIds.length > 0)) {
              msgs.push(msg)
              msgs.push({
                role: 'system',
                content:
                  "ERROR: You are providing technical data from memory. This is FORBIDDEN. You MUST execute 'search_products' to get the real SKU and Price from the database before answering.",
              })
              calls++
              continue
            }

            if (
              finishReason === 'stop' &&
              extracted.message === fallbackMessage &&
              !(msg?.content || '').includes('{')
            ) {
              finalResponseObtained = false
              break
            }
            result = extracted
            finalResponseObtained = true
            break
          }
        }
        if (finalResponseObtained) break
      } catch (e: any) {
        console.error(`Provider ${p.provider_name} failed:`, e.stack || e)
      }
    }

    if (!result || typeof result !== 'object') {
      result = {
        message: fallbackMessage,
        confidence_level: 'low',
        should_show_whatsapp_button: true,
        referenced_internal_products: [],
      }
    } else {
      if (result.content && !result.message) {
        result.message = result.content
      }
      if (!result.message || typeof result.message !== 'string' || !result.message.trim()) {
        result.message = fallbackMessage
        result.confidence_level = 'low'
        result.should_show_whatsapp_button = true
      }
    }

    // Remove unsupported properties to enforce strict JSON structure
    if (result.products) delete result.products
    if (result.content) delete result.content

    if (allReturnedProducts.length === 0) {
      result.confidence_level = 'low'
      result.should_show_whatsapp_button = true

      const negativeRegex =
        /[^.!?\n]*(?:não temos informações|não localizei|não encontrei|não localizamos|não temos)[^.!?\n]*[.!?]?/gi
      if (negativeRegex.test(result.message)) {
        result.message = result.message
          .replace(
            negativeRegex,
            ' No momento, o termo exato não retornou um registro direto em nosso estoque imediato, mas como consultores MY WAY, temos acesso global e podemos viabilizar seu projeto. ',
          )
          .replace(/\s+/g, ' ')
          .trim()
      }
    } else {
      result.confidence_level = 'high'
      const negativeRegex =
        /[^.!?\n]*(?:não temos informações|não localizei|não encontrei|não localizamos|não temos)[^.!?\n]*[.!?]?/gi
      if (negativeRegex.test(result.message)) {
        result.message = result.message.replace(negativeRegex, ' ').replace(/\s+/g, ' ').trim()
      }
    }

    let forceWhatsApp = false
    const lowerQuery = actualQuery.toLowerCase()
    const hasTriggerKeyword =
      Array.isArray(settings.trigger_keywords) &&
      settings.trigger_keywords.some((kw: string) => lowerQuery.includes(kw.toLowerCase()))

    if (settings.whatsapp_trigger_expensive && hasExpensiveProduct) {
      forceWhatsApp = true
    }
    if (
      settings.whatsapp_trigger_low_confidence &&
      result.confidence_level === settings.confidence_threshold
    ) {
      forceWhatsApp = true
    }
    if (result.confidence_level === 'low') {
      forceWhatsApp = true
    }
    if (hasTriggerKeyword) {
      forceWhatsApp = true
    }
    if (allowedProductIds.size === 0) {
      forceWhatsApp = true
    }

    result.should_show_whatsapp_button = forceWhatsApp || !!result.should_show_whatsapp_button

    let refs: string[] = []
    if (Array.isArray(result.referenced_internal_products)) {
      refs = result.referenced_internal_products
        .map((p: any) => (typeof p === 'string' ? p : p.id))
        .filter(Boolean)
    }

    // Eliminate Auto-Discovery: AI is the sole authority for metadata.
    // Validate each UUID given by AI against allowedProductIds.
    const validatedRefs: string[] = []
    refs.forEach((id) => {
      if (allowedProductIds.has(id)) {
        validatedRefs.push(id)
      }
    })

    if (validatedRefs.length === 0) {
      const messageContentLower = (result.message || '').toLowerCase()
      const hasSpecsOrModels = messageContentLower.match(
        /\b(resolução|sensor|peso|dimensões|hz|kg|lbs|mm|cm|polegadas|4k|8k|1080p|hdmi|sdi)\b/,
      )
      if (hasSpecsOrModels) {
        result.confidence_level = 'low'
        result.should_show_whatsapp_button = true
      }
    }

    result.referenced_internal_products = Array.from(new Set(validatedRefs))

    result.message = (result.message || '').replace(/\n*## /g, '\n\n## ').trim()

    if (allReturnedProducts.length === 0) {
      const transparencyNote =
        globalSettingsMap['transparency_note'] ||
        'Nota de Transparência: Os preços e disponibilidades informados podem sofrer alterações sem aviso prévio. Consulte um especialista para confirmar as condições comerciais.'
      if (!result.message.includes('Nota de Transparência')) {
        result.message = result.message.trim() + '\n\n' + transparencyNote
      }
    }

    if (
      result.confidence_level === 'high' &&
      Array.isArray(result.referenced_internal_products) &&
      result.referenced_internal_products.length > 0
    ) {
      supabase
        .from('product_search_cache')
        .insert({
          search_query: actualQuery,
          product_name: actualQuery,
          source: 'ai_generated',
          product_description: result.message,
          product_specs: result,
        })
        .then(({ error }) => {
          if (error) console.error('Cache insertion error:', error)
        })
        .catch(console.error)
    }

    console.log('FINAL JSON OBJECT TO CLIENT:', JSON.stringify(result))

    const responseHeaders: any = { ...corsHeaders, 'Content-Type': 'application/json' }
    if (isAdmin) {
      responseHeaders['Cache-Control'] = 'no-cache'
    }

    return new Response(JSON.stringify(result), {
      headers: responseHeaders,
      status: 200,
    })
  } catch (error: any) {
    console.error('Fatal ai-search error:', error.stack || error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
