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
    try {
      const parsed = JSON.parse(bodyText)
      query = parsed.query || bodyText
      sessionId = parsed.session_id
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
    const bypassCache = true // Forçar nova leitura (limpeza pontual solicitada)

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

    const settings = {
      price: aiSettings?.price_threshold_usd ?? 5000,
      kws: set?.whatsapp_trigger_keywords || [],
      maxWeb: set?.max_web_search_attempts ?? 2,
      conf: set?.confidence_threshold_for_whatsapp ?? 'low',
      systemPromptTemplate: aiSettings?.system_prompt_template || '',
      logisticsRulesPrompt:
        (aiSettings?.logistics_rules_prompt || '') +
        '\nIMPORTANTE: Se o produto não tiver preço cadastrado (0 ou nulo) tanto em USD quanto Nacionalizado, a disponibilidade é "Sob Consulta" e NUNCA presuma que é estoque exclusivo do Brasil.',
      ignore_stock_count: aiSettings?.ignore_stock_count ?? true,
      proactivity_level: set?.proactivity_level ?? 5,
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
              expandedQuery += ' ' + (intent.expansion || '')
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
        'DADOS REAIS NAB 2026:\n' +
        intelligence
          .map((i: any) => `Title: ${i.title}\nSummary: ${i.ai_summary}\nContent: ${i.raw_content}`)
          .join('\n\n')
    }

    const { data: cData } = await supabase.from('company_info').select('content, type')
    const compInfo = (cData || []).map((c: any) => `[${c.type}]: ${c.content}`).join('\n')

    // Build the productOrQuery using the top 10 most specific (longest) terms found in the query.
    let productOrQuery = ''
    if (relevantTerms.length > 0) {
      const topTerms = [...relevantTerms]
        .sort((a: string, b: string) => b.length - a.length)
        .slice(0, 10)
      productOrQuery = topTerms
        .map(
          (t: string) =>
            'name.ilike.%' + t + '%,description.ilike.%' + t + '%,sku.ilike.%' + t + '%',
        )
        .join(',')
    } else {
      productOrQuery = `name.ilike.%${safeQueryForOr}%,description.ilike.%${safeQueryForOr}%,sku.ilike.%${safeQueryForOr}%`
    }

    const { data: allProducts } = await supabase
      .from('products')
      .select(
        `id, name, sku, description, price_usd, price_cost, price_nationalized_sales, price_nationalized_cost, price_nationalized_currency, weight, category_id, manufacturer_id, technical_info, image_url, is_discontinued, stock, category`,
      )
      .or(productOrQuery)
      .limit(50)

    let productsCtx = (allProducts || []).sort((a, b) => {
      if (a.sku?.toLowerCase() === actualQuery.toLowerCase()) return -1
      if (b.sku?.toLowerCase() === actualQuery.toLowerCase()) return 1
      return 0
    })

    // 4. FILTER: Apply 'ignore_stock_count'
    if (settings.ignore_stock_count === false) {
      productsCtx = productsCtx.filter((p: any) => p.stock > 0)
    }

    const formattedInventory = productsCtx
      .map(
        (p: any) =>
          `ID: ${p.id}\nProduct: ${p.name}\nDescription: ${p.description || ''}\nTechnical Specifications: ${p.technical_info || ''}\nPrice: ${p.price_usd || 0} USD\nDiscontinued: ${p.is_discontinued ? 'Yes' : 'No'}`,
      )
      .join('\n\n')

    const { data: providers } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })
    if (!providers?.length) throw new Error('No active providers found')

    let result: any = null,
      finalWeb = false

    const fallbackPrompt =
      'You are a Senior AV Solutions Expert. Your primary mission is to facilitate the sale by providing complete solutions.'
    let basePrompt = settings.systemPromptTemplate
    if (!basePrompt || basePrompt.trim() === '') {
      basePrompt = fallbackPrompt
    }

    // KNOWLEDGE: Inject 'technical_bridge'
    let technicalBridgeRules = ''
    if (settings.technical_bridge) {
      try {
        const bridges =
          typeof settings.technical_bridge === 'string'
            ? JSON.parse(settings.technical_bridge)
            : settings.technical_bridge
        if (Array.isArray(bridges) && bridges.length > 0) {
          technicalBridgeRules =
            '\n\nREGRAS DE PONTE TÉCNICA (Obrigatório):\n' +
            bridges
              .map(
                (b: any) =>
                  `- Se a fonte é ${b.source} e o destino é ${b.target}, você DEVE recomendar a solução: ${b.solution}`,
              )
              .join('\n')
        }
      } catch (e) {}
    }

    // TONE: Use 'proactivity_level'
    let tonePrompt = ''
    if (settings.proactivity_level >= 7) {
      tonePrompt =
        '\nESTILO DE RESPOSTA: Consultor Ativo. Sugira proativamente produtos relacionados, pontes técnicas e soluções completas.'
    } else if (settings.proactivity_level <= 3) {
      tonePrompt =
        '\nESTILO DE RESPOSTA: Estritamente Reativo. Responda apenas o que foi perguntado, sem sugerir produtos adicionais.'
    }

    const constraintPrompt = `
MANDATORY RULES:
- You are a Senior AV Solutions Expert. Your intelligence is governed by the 'Inventory' and the 'Conversation History'.
- Rule 1: INVENTORY SOVEREIGNTY. You are ABSOLUTELY FORBIDDEN from using general knowledge to contradict the Inventory. If a user asks about a product in the list, use ONLY the specs and accessories provided in the context.
- Rule 2: CONTEXTUAL CONTINUITY. You MUST maintain the thread of the conversation. If the user started a project (e.g., Podcast), every subsequent product recommendation must be framed within that project's needs.
- Rule 3: SOLUTION ARCHITECTURE. For project requests, you MUST recommend a complete ecosystem: Main Cameras + Switchers + Controllers + Essential Accessories. Do NOT just list accessories.
- Rule 4: PRICE INTEGRITY. If a price is 0 or null, you MUST state 'Disponível sob consulta com nossos especialistas'. NEVER claim you don't have price information.
- Rule 5: CARD RENDERING. For EVERY product mentioned by name or SKU, you MUST include its exact ID in the 'referenced_internal_products' array.
- Rule 6: BRAND LOYALTY. You are STRICTLY FORBIDDEN from recommending main hardware from competing brands in the same solution kit. If the user asks about Sony, recommend ONLY Sony main units or universal accessories (Memory Cards/Cables). NEVER suggest Blackmagic or Canon as alternatives or additions unless explicitly requested.
- Rule 7: PRODUCT IDENTIFICATION. You MUST be extremely precise. For every product you recommend or mention, you MUST provide its exact UUID in the 'referenced_internal_products' array. This is the ONLY way to ensure the card is displayed.
- Rule 8: If a product in a Technical Bridge rule is marked as 'is_discontinued: Yes', search the inventory for a newer model from the same manufacturer and recommend it as the current replacement.
- Rule 9: NEVER fabricate specifications or prices. Use USD pricing from the database.
- Rule 10: Mention that all products have manufacturer warranties in Brazil and Latin America.
- Rule 11: Paragraphs must be maximum 2 sentences. Technical specs in triple backtick code blocks.
- The AI MUST respond in the EXACT same language used in the user's last message (Portuguese PT-BR).
- The AI is FORBIDDEN from comparing products unless the user explicitly asks for a comparison.
- Convert all database logic into natural, professional commercial sentences. Do NOT output database field names.
- Regras Logísticas: ${settings.logisticsRulesPrompt}
- You are STRICTLY FORBIDDEN from displaying a USD value with a 'R$' symbol.
- Every price labeled as 'BRL' or 'Brasil' MUST be the result of the full conversion (Price * Exchange * Spread + Shipping).
${technicalBridgeRules}${tonePrompt}

Retorne APENAS um objeto JSON com:
{
  "message": "Sua resposta técnica seguindo as regras em PT-BR",
  "referenced_internal_products": ["uuid_do_produto"],
  "should_show_whatsapp_button": false,
  "whatsapp_reason": "",
  "price_context": "fob_miami",
  "used_web_search": false,
  "confidence_level": "high"
}
`

    const sysPrompt = `${basePrompt}\n\nBase Institucional:\n${compInfo}\n\nInventário:\n${formattedInventory}\n\n${constraintPrompt}`

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
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${p.model_id}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: `SYSTEM:\n${sysPrompt}\n\nUSER:\n${actualQuery}` }],
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
          let msgs: any[] = [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: actualQuery },
          ]
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

    if (result.message) {
      const normalizedMsg = result.message
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      const exactLowConfidencePhrases = [
        'recomendo verificar',
        'depende de',
        'pode variar',
        'nao tenho informacao',
        'consulte',
        'entre em contato',
        'fale com especialista',
        'nao tenho confirmacao',
        'nao posso confirmar',
        'verifique',
        'confira',
        'consulte a documentacao',
      ]

      let isLowConfidence = exactLowConfidencePhrases.some((phrase: string) =>
        normalizedMsg.includes(phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
      )

      if (normalizedMsg.includes('depende do') && normalizedMsg.includes('recomendo verificar'))
        isLowConfidence = true
      if (normalizedMsg.includes('opcoes de frete') || normalizedMsg.includes('checkout'))
        isLowConfidence = true
      if (
        normalizedMsg.includes('entre 7 a 15 dias') &&
        normalizedMsg.includes('recomendo verificar')
      )
        isLowConfidence = true

      const genericWords = ['depende', 'pode variar', 'recomendo']
      const hasGenericWords = genericWords.some((w: string) =>
        normalizedMsg.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
      )

      const hasSpecificData =
        /\d/.test(normalizedMsg) ||
        /(fps|hz|khz|mbps|gbps|sdi|hdmi|usb|4k|8k|1080p)/i.test(normalizedMsg)

      if (hasGenericWords && !hasSpecificData) {
        isLowConfidence = true
      }

      if (
        normalizedMsg.includes('suporte') ||
        normalizedMsg.includes('especialista') ||
        normalizedMsg.includes('equipe')
      ) {
        isLowConfidence = true
      }

      result.confidence_level = isLowConfidence ? 'low' : 'high'
    } else if (!hasNabIntelligence) {
      result.confidence_level = 'low'
    }

    let show = false,
      reason = ''
    let refs = Array.isArray(result.referenced_internal_products)
      ? result.referenced_internal_products
      : []
    if (refs.length === 0 && Array.isArray(result.products)) {
      refs = result.products.map((p: any) => (typeof p === 'string' ? p : p.id)).filter(Boolean)
    }

    if (result.confidence_level === settings.conf) {
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
      refs.length > 0 &&
      productsCtx.some((p: any) => refs.includes(p.id) && (p.price_usd || 0) > settings.price)
    ) {
      show = true
      reason = 'Produto premium. Especialista pode oferecer condições especiais.'
    } else if (refs.length >= 3) {
      show = true
      reason = 'Múltiplos produtos. Especialista pode montar solução integrada.'
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
