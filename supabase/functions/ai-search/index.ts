import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

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
    const fallbackRes = {
      message:
        'Neste momento o sistema está indisponível para pesquisas automáticas. Por favor, contate nossos especialistas via WhatsApp.',
      referenced_internal_products: [],
      should_show_whatsapp_button: true,
      whatsapp_reason: 'Sistema de IA temporariamente indisponível.',
      price_context: 'fob_miami',
      used_web_search: false,
      confidence_level: 'low',
      has_nab_intelligence: false,
    }

    const supUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    console.log('Env vars present:', {
      SUPABASE_URL: !!supUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
    })

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
    try {
      const parsed = JSON.parse(bodyText)
      query = parsed.query || bodyText
      sessionId = parsed.session_id
      history = parsed.history || parsed.context?.history || []
      userName = parsed.userName || userName
      productName = parsed.productName || productName
      technicalInfo = parsed.technicalInfo || technicalInfo
    } catch {
      query = bodyText
    }

    console.log('Received query:', query)

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('Query is required')
    }

    let actualQuery = query
    const userQueryMatch = query.match(/User Query: (.*)/)
    if (userQueryMatch) {
      actualQuery = userQueryMatch[1]
    }

    const qL = actualQuery.toLowerCase()
    const hasProductContext = (productName && productName !== 'Não informado') || (technicalInfo && technicalInfo !== 'Não informado')
    const bypassCache = hasProductContext // Bypass when productName or technicalInfo is provided

    // Limpeza pontual no cache para forçar a nova leitura dos dados atualizados
    try {
      await supabase.from('product_search_cache').delete().eq('search_query', actualQuery)
    } catch (e) {
      console.error('Erro ao limpar cache:', e)
    }

    let cachedResult: any = null
    let expiredCachedResult: any = null

    if (!bypassCache) {
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const safeQuery = actualQuery.replace(/[%_]/g, '\\$&')
        const { data: cacheData } = await supabase
          .from('product_search_cache')
          .select('*')
          .ilike('search_query', safeQuery)
          .eq('source', 'ai_generated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cacheData) {
          const createdAtDate = cacheData.created_at ? new Date(cacheData.created_at) : new Date(0)
          if (createdAtDate > thirtyDaysAgo) {
            cachedResult = cacheData
          } else {
            expiredCachedResult = cacheData
          }
        }
      } catch (e) {
        console.error('Cache lookup failed:', e)
      }
    }

    if (cachedResult && cachedResult.product_specs) {
      console.log(`Cache hit for query: ${actualQuery}`)
      return new Response(JSON.stringify(cachedResult.product_specs), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: set } = await supabase
      .from('ai_agent_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    
    // 1. Query the 'settings' table in Supabase to get global prompts and templates
    const { data: globalSettingsData } = await supabase
      .from('settings')
      .select('key, value')

    const globalSettingsMap: Record<string, string> = {}
    globalSettingsData?.forEach((s: any) => {
      if (s.value) globalSettingsMap[s.key] = s.value
    })

    const settings = {
      price: aiSettings?.price_threshold_usd ?? 0,
      kws: set?.whatsapp_trigger_keywords || [],
      maxWeb: set?.max_web_search_attempts ?? 2,
      conf: set?.confidence_threshold_for_whatsapp ?? 'low',
      system_prompt: globalSettingsMap['system_prompt'] || set?.system_prompt || '',
      systemPromptTemplate: globalSettingsMap['prompt_template'] || aiSettings?.system_prompt_template || '',
      response_format_json: aiSettings?.response_format_json || '',
      logisticsRulesPrompt:
        (aiSettings?.logistics_rules_prompt || '') +
        '\nIMPORTANTE: Se o produto não tiver preço cadastrado (0 ou nulo), a disponibilidade é "Sob Consulta".',
      ignore_stock_count: aiSettings?.ignore_stock_count ?? true,
      proactivity_level: set?.proactivity_level ?? 8,
      technical_bridge: aiSettings?.technical_bridge,
      intent_mapping: aiSettings?.intent_mapping,
      custom_stop_words: aiSettings?.custom_stop_words,
    }

    // 2. EXPAND: Check 'intent_mapping' (Section H)
    let expandedQuery = actualQuery
    if (settings.intent_mapping) {
      try {
        const intentMap =
          typeof settings.intent_mapping === 'string'
            ? JSON.parse(settings.intent_mapping)
            : settings.intent_mapping
        if (Array.isArray(intentMap)) {
          for (const intent of intentMap) {
            if (
              intent.trigger &&
              actualQuery.toLowerCase().includes(intent.trigger.toLowerCase())
            ) {
              expandedQuery += ' ' + (intent.expansion || intent.expansions || '')
            }
          }
        }
      } catch (e) {}
    }

    const safeQueryForOr = expandedQuery.replace(/[%_,()[\]{}"'\\]/g, ' ')

    // 1. PRE-PROCESS: Use 'custom_stop_words' (Section J)
    const stopWords = new Set([
      'que',
      'qual',
      'como',
      'para',
      'por',
      'com',
      'uma',
      'um',
      'tem',
      'temos',
      'voces',
      'voce',
      'mostrar',
      'mostre',
      'quero',
      'gostaria',
      'saber',
      'preco',
      'valor',
      'sobre',
      'esse',
      'essa',
      'este',
      'esta',
      'aqui',
      'ali',
      'cabo',
      'the',
      'what',
      'who',
      'how',
      'why',
      'can',
      'you',
      'show',
      'tell',
      'about',
      'price',
      'cost',
      'favor',
      'poderia',
      'quais',
    ])

    if (settings.custom_stop_words) {
      settings.custom_stop_words
        .split(',')
        .map((w: string) => w.trim().toLowerCase())
        .forEach((w: string) => stopWords.add(w))
    }

    const allTerms = safeQueryForOr
      .toLowerCase()
      .split(/\s+/)
      .filter((t: string) => t.length >= 2)
    let qTerms = allTerms.filter((t: string) => !stopWords.has(t))

    // REFINED LOGIC: Do NOT discard alphabetic terms.
    // We use all non-stop-word terms (qTerms) if available, otherwise allTerms.
    const relevantTerms = qTerms.length > 0 ? qTerms : allTerms

    const orQuery =
      relevantTerms.length > 0
        ? relevantTerms
            .map(
              (t: string) => `title.ilike.%${t}%,raw_content.ilike.%${t}%,ai_summary.ilike.%${t}%`,
            )
            .join(',')
        : `title.ilike.%${safeQueryForOr}%,raw_content.ilike.%${safeQueryForOr}%,ai_summary.ilike.%${safeQueryForOr}%`

    const { data: intelligence } = await supabase
      .from('market_intelligence')
      .select('title, raw_content, ai_summary')
      .eq('status', 'published')
      .or(orQuery)
      .limit(10)

    let hasNabIntelligence = false
    let nabContext = ''
    if (intelligence && intelligence.length > 0) {
      hasNabIntelligence = true
      nabContext =
        'INSIGHTS ESTRATÉGICOS:\n' +
        intelligence
          .map((i: any) => `Title: ${i.title}\nSummary: ${i.ai_summary}\nContent: ${i.raw_content}`)
          .join('\n\n')
    }

    const { data: cData } = await supabase.from('company_info').select('content, type')
    const compInfo = (cData || []).map((c: any) => `[${c.type}]: ${c.content}`).join('\n')

    // Step 1: Manufacturer Check
    const { data: manufacturers } = await supabase.from('manufacturers').select('id, name')
    
    // Step 2 & 3: Query Parsing and Strict Filtering
    let manufacturerId = null;
    let matchedManufacturer = "";
    if (manufacturers) {
      for (const m of manufacturers) {
        if (qL.includes(m.name.toLowerCase())) {
          manufacturerId = m.id;
          matchedManufacturer = m.name;
          break;
        }
      }
    }

    let currentProductId = null;
    if (productName && productName !== 'Não informado') {
      const { data: currentProductMatch } = await supabase
        .from('products')
        .select('id')
        .ilike('name', `%${productName}%`)
        .limit(1)
        .maybeSingle();
      if (currentProductMatch) {
         currentProductId = currentProductMatch.id;
      }
    }

    // Build the productOrQuery using the top 10 most specific (longest) terms found in the query.
    let productOrQuery = ''
    if (relevantTerms.length > 0) {
      const topTerms = [...relevantTerms]
        .sort((a: string, b: string) => b.length - a.length)
        .slice(0, 10)
      productOrQuery = topTerms
        .map((t: string) => `name.ilike.%${t}%,description.ilike.%${t}%,sku.ilike.%${t}%`)
        .join(',')
    } else {
      productOrQuery = `name.ilike.%${safeQueryForOr}%,description.ilike.%${safeQueryForOr}%,sku.ilike.%${safeQueryForOr}%`
    }

    let productQuery = supabase
      .from('products')
      .select(
        `id, name, sku, description, price_usd, price_cost, price_nationalized_sales, price_nationalized_cost, price_nationalized_currency, weight, category_id, manufacturer_id, technical_info, image_url, is_discontinued, stock, category`,
      )
      .or(productOrQuery)

    if (manufacturerId) {
      productQuery = productQuery.eq('manufacturer_id', manufacturerId);
    }

    // Step 4: Context Thinning - Fetch up to 35 products
    const { data: allProducts } = await productQuery.limit(35)

    let productsCtx = (allProducts || []).sort((a, b) => {
      // Step 5: Priority Sorting
      const aNameMatch = a.name?.toLowerCase().includes(actualQuery.toLowerCase()) ? 1 : 0;
      const bNameMatch = b.name?.toLowerCase().includes(actualQuery.toLowerCase()) ? 1 : 0;
      const aSkuMatch = a.sku?.toLowerCase() === actualQuery.toLowerCase() ? 2 : 0;
      const bSkuMatch = b.sku?.toLowerCase() === actualQuery.toLowerCase() ? 2 : 0;
      
      if (aSkuMatch !== bSkuMatch) return bSkuMatch - aSkuMatch;
      if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;
      return 0;
    })

    // 4. FILTER: Apply 'ignore_stock_count'
    if (settings.ignore_stock_count === false) {
      productsCtx = productsCtx.filter((p: any) => p.stock > 0)
    }

    const formattedInventory = productsCtx
      .map((p: any, index: number) => {
        if (index < 6) {
          return `ID: ${p.id}\nProduct: ${p.name}\nSKU: ${p.sku}\nPrice USD: ${p.price_usd || 0}\nPrice BRL: ${p.price_nationalized_sales || 0}\nDescription: ${p.description || ''}\nTechnical Specifications: ${p.technical_info || ''}\nDiscontinued: ${p.is_discontinued ? 'Yes' : 'No'}`
        } else {
          return `ID: ${p.id}\nProduct: ${p.name}\nManufacturer ID: ${p.manufacturer_id}`
        }
      })
      .join('\n\n')

    const { data: providers } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })
    if (!providers?.length) throw new Error('No active providers found')

    let result: any = null,
      finalWeb = false

    // 3. Use the Admin Panel settings as the primary instruction set.
    const finalBasePrompt = settings.system_prompt || settings.systemPromptTemplate || 'Você é um Especialista My Way.'

    // 2. Prepend context
    const userContext = `Você é um consultor na My Way. O usuário já está vendo o produto ${productName}. Use as especificações dele para embasar sua resposta, mas foque em sugerir COMPLEMENTOS ou ALTERNATIVAS. Nunca retorne o ID do produto atual no array de resultados, apenas de outros produtos citados.\nEspecificações do produto atual: ${technicalInfo}\n`

    // AI Directives
    const aiDirectives = `
DIRETRIZES DE IA:
- Você deve fornecer uma resposta técnica e cordial para ${userName}. IMPORTANTE: Nunca escreva IDs no texto, mas você deve garantir que os produtos mencionados apareçam no array de metadados da resposta.
- Seja técnico e detalhado. Use o contexto de 'market_intelligence' para enriquecer a resposta.
- Priorize terminar a explicação sobre listar muitos itens. Se a resposta for interrompida por limite de espaço, você deve resumir e o botão de WhatsApp deve ser a última coisa renderizada pelo componente.
`

    // Confidence Logic explicitly added to the prompt
    const confidenceInstruction = `INSTRUÇÃO CRÍTICA: Você deve SEMPRE responder com uma análise técnica detalhada. NÃO substitua a resposta técnica por mensagens genéricas de suporte. You are looking at the product ${productName}. This product IS in our inventory. Use these specs as your primary source: ${technicalInfo}. Do NOT say the product is not found. Answer based on this context first.\nAI Instruction: Você deve cruzar os INSIGHTS ESTRATÉGICOS com o catálogo de PRODUTOS. Se citar uma tendência ou item, procure o ID correspondente no catálogo para gerar o card. Priorize dados técnicos sobre textos genéricos. Nunca invente IDs. Se o produto não estiver na lista fornecida, forneça as informações técnicas possíveis e apenas no final acione o botão de WhatsApp. Se um fabricante do nosso banco for citado, foque 100% nos produtos dele. Com a lista de contexto, identifique o ID correto para gerar o card. Se a resposta ficar muito longa, resuma e mostre o botão do WhatsApp.`

    const sysPrompt = `${userContext}\n${finalBasePrompt}\n\n${aiDirectives}\n\n${confidenceInstruction}\n\nBase Institucional:\n${compInfo}\n\n${nabContext}\n\nInventário:\n${formattedInventory}\n\nObrigatório: Responda em JSON com as chaves 'message', 'referenced_internal_products' e 'should_show_whatsapp_button' (boolean). A resposta principal deve estar na chave 'message'.`

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description: 'Google Custom Search para specs.',
          parameters: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
        },
      },
    ]

    for (const p of providers) {
      const key = Deno.env.get(p.api_key_secret_name)

      if (!key) {
        return new Response(
          JSON.stringify({ error: 'Chave de API nao configurada. Tente novamente.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      try {
        if (p.provider_name === 'gemini') {
          let geminiHistoryText = ''
          if (Array.isArray(history) && history.length > 0) {
            geminiHistoryText =
              'HISTORY:\n' + history.map((h) => `${h.role}: ${h.content}`).join('\n') + '\n\n'
          }
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${p.model_id}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `SYSTEM:\n${sysPrompt}\n\n${geminiHistoryText}USER:\n${actualQuery}`,
                      },
                    ],
                  },
                ],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            },
          )
          if (!res.ok) throw new Error(await res.text())
          result = JSON.parse((await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '{}')
          break
        } else {
          const url =
            p.provider_name === 'deepseek'
              ? 'https://api.deepseek.com/chat/completions'
              : 'https://api.openai.com/v1/chat/completions'
          let msgs: any[] = [{ role: 'system', content: sysPrompt }]
          if (Array.isArray(history) && history.length > 0) {
            msgs.push(...history)
          }
          msgs.push({ role: 'user', content: actualQuery })
          let calls = 0,
            usedWeb = false

          while (calls <= settings.maxWeb) {
            const payload: any = {
              model: p.model_id,
              messages: msgs,
              response_format: { type: 'json_object' },
            }
            if (calls < settings.maxWeb) {
              payload.tools = tools
              payload.tool_choice = 'auto'
            }

            const res = await fetch(url, {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error(await res.text())

            const msg = (await res.json()).choices?.[0]?.message
            if (msg?.tool_calls) {
              usedWeb = true
              msgs.push(msg)
              for (const t of msg.tool_calls) {
                let content = 'Web search unavailable'
                const gKey = Deno.env.get('GOOGLE_SEARCH_API_KEY'),
                  gCx = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
                if (gKey && gCx) {
                  const queryArgs = JSON.parse(t.function.arguments).q || ''
                  try {
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 7000)
                    const gsRes = await fetch(
                      `https://www.googleapis.com/customsearch/v1?key=${gKey}&cx=${gCx}&q=${encodeURIComponent(queryArgs)}`,
                      { signal: controller.signal },
                    )
                    clearTimeout(timeoutId)
                    if (gsRes.ok)
                      content = ((await gsRes.json()).items || [])
                        .slice(0, 3)
                        .map((i: any) => i.snippet)
                        .join('\n')
                  } catch (e) {
                    content = 'Web search timeout exceeded (7 seconds).'
                  }
                }
                msgs.push({ role: 'tool', tool_call_id: t.id, content })
              }
              calls++
            } else {
              result = JSON.parse(msg?.content || '{}')
              finalWeb = usedWeb
              break
            }
          }
          if (result) break
        }
      } catch (e) {
        console.error(`Provider ${p.provider_name} failed:`, e)
      }
    }

    if (!result) {
      if (expiredCachedResult && expiredCachedResult.product_specs) {
        console.log(`Fallback to expired cache for query: ${actualQuery}`)
        return new Response(JSON.stringify(expiredCachedResult.product_specs), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw new Error('All AI providers failed.')
    }

    if (!result.message || result.message.trim() === '') {
      result.message = `${userName}, analisei as informações disponíveis mas não encontrei detalhes exatos para essa especificação. Por favor, consulte nossos especialistas no WhatsApp.`
      result.confidence_level = 'low'
    } else {
      const normalizedMsg = result.message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const lowConfidenceIndicators = [
        'com os dados que tenho',
        'dados disponiveis',
        'nao encontrei',
        'nao tenho informacao',
        'whatsapp',
        'especialista'
      ]
      
      let isLowConfidence = lowConfidenceIndicators.some((phrase: string) => normalizedMsg.includes(phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
      result.confidence_level = isLowConfidence ? 'low' : 'high'
    }

    let show = false,
      reason = ''
    // 🔧 Auditoria Ninja: Unificação de Referências para Exibição de Cards
    let refs: string[] = []
    if (Array.isArray(result.related_product_ids) && result.related_product_ids.length > 0) {
      refs = result.related_product_ids
        .map((p: any) => (typeof p === 'string' ? p : p.id))
        .filter(Boolean)
    } else if (
      Array.isArray(result.referenced_internal_products) &&
      result.referenced_internal_products.length > 0
    ) {
      refs = result.referenced_internal_products
    } else if (Array.isArray(result.products)) {
      refs = result.products.map((p: any) => (typeof p === 'string' ? p : p.id)).filter(Boolean)
    }

    const resolvedRefs = refs
      .map((refId: string) => {
        const p = productsCtx.find((prod: any) => prod.id === refId)
        if (p) {
          return p.id
        }
        return refId
      })
      .filter(Boolean)
      .filter((refId: string) => refId !== currentProductId)

    // WhatsApp Button Contract
    // Set to TRUE if: no products found, technical confidence is low, or AI mentions 'WhatsApp/Especialista'
    if (
      resolvedRefs.length === 0 || 
      result.confidence_level === 'low' || 
      (result.message && (result.message.toLowerCase().includes('whatsapp') || result.message.toLowerCase().includes('especialista')))
    ) {
      show = true
      reason = 'Produto não encontrado ou necessidade de assistência técnica especializada.'
    } else if (result.confidence_level === settings.conf) {
      show = true
      reason = 'Necessidade de assistência técnica especializada.'
    } else if (settings.kws.some((k: string) => qL.includes(k.toLowerCase()))) {
      show = true
      reason = 'Interesse demonstrado em compra. Especialista pode oferecer descontos.'
    } else if (
      [
        'integração',
        'solução completa',
        'customização',
        'setup',
        'instalação',
        'projeto',
        'implementação',
        'sistema completo',
      ].some((k) => qL.includes(k))
    ) {
      show = true
      reason = 'Projeto complexo requer consultoria especializada.'
    } else if (
      resolvedRefs.length > 0 &&
      productsCtx.some((p: any) => resolvedRefs.includes(p.id) && (p.price_usd || 0) > settings.price)
    ) {
      show = true
      reason = 'Produto premium. Especialista pode oferecer condições especiais.'
    } else if (resolvedRefs.length >= 3) {
      show = true
      reason = 'Múltiplos produtos. Especialista pode montar solução integrada.'
    }

    result.should_show_whatsapp_button = show || !!result.should_show_whatsapp_button
    result.whatsapp_reason = show ? reason : result.whatsapp_reason || ''
    result.used_web_search = finalWeb
    result.price_context = 'fob_miami'
    result.referenced_internal_products = resolvedRefs
    result.has_nab_intelligence = hasNabIntelligence

    if (result.referenced_internal_products?.length > 0 || result.has_nab_intelligence) {
      console.log(`Cache miss, saved new entry for query: ${actualQuery}`)
      supabase
        .from('product_search_cache')
        .insert({
          search_query: actualQuery,
          product_name: 'AI Match',
          source: 'ai_generated',
          product_description: result.message,
          product_specs: result,
        })
        .then()
    } else {
      console.log(`Results not saved to cache (empty stock/intelligence) for query: ${actualQuery}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Fatal ai-search error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
