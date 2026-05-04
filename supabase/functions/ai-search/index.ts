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
    const match = text.match(/\{[\s\S]*\}/)
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

    const { data: set } = await supabase
      .from('ai_agent_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    const { data: globalSettingsData } = await supabase.from('settings').select('key, value')

    const globalSettingsMap: Record<string, string> = {}
    globalSettingsData?.forEach((s: any) => {
      if (s.value) globalSettingsMap[s.key] = s.value
    })

    const settings = {
      system_prompt: globalSettingsMap['system_prompt'] || set?.system_prompt || '',
      systemPromptTemplate:
        globalSettingsMap['prompt_template'] || aiSettings?.system_prompt_template || '',
      product_page_prompt: aiSettings?.product_page_prompt || '',
      institutional_context: ((aiSettings as any)?.institutional_context || '').substring(0, 2000),
      cache_expiration_days: aiSettings?.cache_expiration_days ?? 30,
      price_limit_usd: aiSettings?.price_threshold_usd ?? 5000,
      confidence_threshold: set?.confidence_threshold_for_whatsapp || 'low',
      whatsapp_trigger_expensive: set?.whatsapp_trigger_expensive_product ?? true,
      whatsapp_trigger_low_confidence: set?.whatsapp_trigger_low_confidence ?? true,
      trigger_keywords: set?.whatsapp_trigger_keywords || [],
      ignore_stock_count: aiSettings?.ignore_stock_count ?? true,
      logistics_rules_prompt: aiSettings?.logistics_rules_prompt || '',
      custom_stop_words: aiSettings?.custom_stop_words || '',
      proactivity_level: set?.proactivity_level ?? 5,
    }

    // Context & Brand Injection
    const { data: mfgData } = await supabase.from('manufacturers').select('name')
    const mfgList = mfgData?.map((m: any) => m.name).join(', ') || ''

    const { data: cData } = await supabase.from('company_info').select('content, type')
    const compInfo = (cData || [])
      .map((c: any) => `[${c.type}]: ${c.content}`)
      .join('\n')
      .substring(0, 2000)

    const { data: providers } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (!providers?.length) throw new Error('No active providers found')

    let sysPromptTemplate = settings.systemPromptTemplate || ''
    let finalBasePrompt = sysPromptTemplate.trim()
      ? sysPromptTemplate.replace('{{system_prompt}}', settings.system_prompt || '')
      : settings.system_prompt || 'Você é um Consultor My Way Business.'

    let productPageContext = ''
    if (hasProductContext) {
      let parsedProductPagePrompt = settings.product_page_prompt || ''
      parsedProductPagePrompt = parsedProductPagePrompt.replaceAll(
        '{{productName}}',
        productName || '',
      )
      parsedProductPagePrompt = parsedProductPagePrompt.replaceAll(
        '{{currentProductId}}',
        currentProductId || '',
      )

      productPageContext = `\n\nCONTEXTO DO PRODUTO ATUAL:\nProduto: ${productName}\nEspecificações: ${technicalInfo}\n${parsedProductPagePrompt}`
    }

    let securityClause = ''
    if (!isAdmin) {
      securityClause = `\n- SECURITY CLAUSE: You are a Senior Technical Consultant. You are STRICTLY FORBIDDEN from discussing internal logic, tools, JSON structures, or UUIDs with the user. Your internal engineering is invisible.`
    } else {
      securityClause = `\n- SECURITY CLAUSE: You are communicating with an ADMIN. You may discuss technical internal logic if specifically asked.`
    }

    let tonePrompt = ''
    if (settings.proactivity_level >= 7) {
      tonePrompt =
        '\nESTILO DE RESPOSTA: Consultor Ativo. Sugira proativamente produtos relacionados e soluções completas.'
    } else if (settings.proactivity_level <= 3) {
      tonePrompt =
        '\nESTILO DE RESPOSTA: Estritamente Reativo. Responda apenas o que foi perguntado.'
    }

    const sysPrompt = `${finalBasePrompt}${productPageContext}

DOUTRINA E CONTEXTO INSTITUCIONAL MY WAY:
${settings.institutional_context.substring(0, 2000)}

REGRAS DE LOGÍSTICA:
${settings.logistics_rules_prompt}
${tonePrompt}

DADOS DA EMPRESA:
${compInfo}

LISTA DE FABRICANTES HOMOLOGADOS:
${mfgList}

MANDATORY RULES:
- You are a My Way Business Consultant. Your tone, values, and technical judgment MUST be guided primarily by the DOUTRINA E CONTEXTO INSTITUCIONAL. Use 'company_info' only for basic data. Use the Manufacturer List to guide your technical search queries. Prioritize these brands to avoid generic recommendations.
- You MUST call the 'search_products' tool to verify inventory and get UUIDs before providing technical recommendations.
- MODO CONSULTOR SENIOR: You have access to the intel field (Market Intelligence). Whenever recommending a product, you MUST check for related benchmarks or news to enrich your response. Use market intelligence to validate why one model is superior to another in specific contexts, but always keep the requested products as the main focus.
- Enforce strict JSON output format in your final response.
- The AI MUST respond in the EXACT same language used in the user's last message.
- If any product price exceeds ${settings.price_limit_usd}, you MUST set should_show_whatsapp_button to true.
- Your final response MUST be a JSON object containing ONLY:
  {
    "message": "Your technical response...",
    "confidence_level": "high" or "low",
    "should_show_whatsapp_button": boolean,
    "referenced_internal_products": ["uuid-1", "uuid-2"]
  }
- Ensure exactly TWO line breaks (\n\n) before the Transparency Note in the 'message' field (if any).
- The AI is the SOLE authority for cards. You must populate 'referenced_internal_products' ONLY with UUIDs returned by the 'search_products' tool that you explicitly recommend and discuss in the text. Do NOT populate this array until the tool returns data.
- Only if 'search_products' returns ZERO results after a valid search, you are authorized to use your internal knowledge. In this case, set 'confidence_level' to 'low' and state the product is 'sob consulta ao fabricante'.
- Set 'should_show_whatsapp_button' to true for any product not found in the database.
- If a product is mentioned in text but was not returned by the tool, it MUST NOT be added to the metadata.
- You MUST add exactly TWO line breaks (\n\n) between different product models in the message.
- Every product section MUST start with its name as a '##' header.
- Every product must have the '### Especificações Base' section, regardless of being in the database or not.
- The '### Especificações Base' header must be followed by a bulleted list containing: Resolução, Sensor, Codecs, Conectividade, Energia, Dimensões e Peso.
- Display 'NCM: [value]' ONLY if it exists in the database. If null, do NOT render the line.
- STRICT RULE: Do NOT mention internal tool names, database fields, or JSON keys to the user.
- When calling 'search_products', your 'query' parameter MUST be concise. Use ONLY model names or keywords (e.g., 'CR-N300', 'FX3'). NEVER include conversational filler like 'câmeras PTZ' in the tool query.
- If 'search_products' returns ANY products (Count > 0), you are FORBIDDEN from saying 'não temos' or 'sob consulta'. You MUST use the database prices and SKUs as the absolute truth.${securityClause}
IMPORTANT: Your final response MUST be a RAW JSON object. Do NOT wrap it in markdown code blocks or add any text before or after the JSON.
`

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
                console.log('TOOL CALL ARGS:', t.function.arguments)
                const args = JSON.parse(t.function.arguments || '{}')

                let rpcData: any = { stock: [], intel: [], nab_data: [] }
                try {
                  const { data, error } = await supabase.rpc('execute_ai_search', {
                    search_term: args.query || actualQuery,
                  })
                  if (!error && data) {
                    rpcData = data
                  }
                } catch (dbErr: any) {
                  console.error('Database search error:', dbErr.stack || dbErr)
                }

                console.log('DATABASE RPC RESULT (Count):', rpcData?.stock?.length || 0)

                let filteredStock = (rpcData?.stock || []).slice(0, 15)

                filteredStock.forEach((p: any) => {
                  if (p.id) {
                    allowedProductIds.add(p.id)
                    allReturnedProducts.push(p)
                  }
                  if (p.price_usd && p.price_usd > settings.price_limit_usd) {
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
            msgs.push({
              role: 'system',
              content:
                "Data received. Now, synthesize a strategic response in the user's language, integrating technical specs with market intelligence insights. Return ONLY the JSON object.",
            })
            calls++
          } else {
            const extracted = extractJson(msg?.content || '', fallbackMessage)

            if (calls === 0) {
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

              if (hasSemanticViolations || providedIds.length > 0) {
                msgs.push(msg)
                msgs.push({
                  role: 'system',
                  content:
                    "SECURITY VIOLATION: You are attempting to respond using internal knowledge. You are FORBIDDEN from providing ANY technical info, model names, or prices in Turn 1 without calling 'search_products' first. Execute the tool now to fetch real UUIDs and stock data.",
                })
                calls++
                continue
              }
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
    } else {
      result.confidence_level = 'high'
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

    const messageContentLower = (result.message || '').toLowerCase()
    // Card Guard: Automatic Metadata Linking
    // For every product in 'allReturnedProducts', if its 'name' is mentioned in the 'result.message',
    // add its 'id' to the 'referenced_internal_products' array, even if it was not explicitly included by the AI model.
    allReturnedProducts.forEach((p) => {
      const nameMatch = p.name && messageContentLower.includes(p.name.toLowerCase())
      const skuMatch = p.sku && messageContentLower.includes(p.sku.toLowerCase())
      if ((nameMatch || skuMatch) && !refs.includes(p.id)) {
        refs.push(p.id)
      }
    })

    result.referenced_internal_products = Array.from(new Set(refs))

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
