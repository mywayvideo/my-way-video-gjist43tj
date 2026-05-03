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
      history = parsed.history || parsed.context?.history || []
      userName = parsed.userName || userName
      productName = parsed.productName || productName
      technicalInfo = parsed.technicalInfo || technicalInfo
      currentProductId = parsed.currentProductId || null
      isAdmin = !!parsed.isAdmin
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
    const hasProductContext = productName && productName !== 'Não informado'

    try {
      await supabase.from('product_search_cache').delete().eq('search_query', actualQuery)
    } catch (e) {}

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
    const { data: globalSettingsData } = await supabase.from('settings').select('key, value')

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
      systemPromptTemplate:
        globalSettingsMap['prompt_template'] || aiSettings?.system_prompt_template || '',
      response_format_json: aiSettings?.response_format_json || '',
      logisticsRulesPrompt:
        (aiSettings?.logistics_rules_prompt || '') +
        '\nIMPORTANTE: Se o produto não tiver preço cadastrado (0 ou nulo), a disponibilidade é "Sob Consulta".',
      ignore_stock_count: aiSettings?.ignore_stock_count ?? true,
      proactivity_level: set?.proactivity_level ?? 8,
      technical_bridge: aiSettings?.technical_bridge,
      intent_mapping: aiSettings?.intent_mapping,
      custom_stop_words: aiSettings?.custom_stop_words,
      product_page_prompt: aiSettings?.product_page_prompt || '',
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('execute_ai_search', {
      search_term: actualQuery,
    })
    if (rpcError) {
      console.error('RPC Error:', rpcError)
      throw new Error(`Database search failed: ${rpcError.message}`)
    }

    let productsCtx = rpcData?.stock || []
    if (settings.ignore_stock_count === false) {
      productsCtx = productsCtx.filter((p: any) => p.stock > 0)
    }

    const { data: cData } = await supabase.from('company_info').select('content, type')
    const compInfo = (cData || []).map((c: any) => `[${c.type}]: ${c.content}`).join('\n')

    const formattedInventory = productsCtx
      .map((p: any, index: number) => {
        if (index < 10) {
          return `ID: ${p.id}\nProduct: ${p.name}\nSKU: ${p.sku}\nPrice USD: ${p.price_usd || 0}\nPrice BRL: ${p.price_nationalized_sales || 0}\nDescription: ${p.description || ''}\nTechnical Specifications: ${p.technical_info || ''}\nDiscontinued: ${p.is_discontinued ? 'Yes' : 'No'}`
        } else {
          return `ID: ${p.id}\nProduct: ${p.name}`
        }
      })
      .join('\n\n')

    const intelligence = rpcData?.intel || []
    let hasNabIntelligence = false
    let nabContext = ''
    if (intelligence.length > 0) {
      hasNabIntelligence = true
      nabContext =
        'INSIGHTS ESTRATÉGICOS:\n' +
        intelligence
          .map((i: any) => `Title: ${i.title}\nSummary: ${i.ai_summary}\nContent: ${i.raw_content}`)
          .join('\n\n') +
        '\n\nUse os INSIGHTS ESTRATÉGICOS para adicionar valor comercial e tendências de mercado à sua explicação técnica sobre os produtos encontrados.'
    }

    const nabData = rpcData?.nab_data || []
    if (nabData.length > 0) {
      nabContext +=
        '\n\nNAB DATA:\n' +
        nabData.map((n: any) => `Title: ${n.title}\nContent: ${n.content}`).join('\n\n')
    }

    const { data: providers } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (!providers?.length) throw new Error('No active providers found')

    let sysPromptTemplate = settings.systemPromptTemplate || ''
    let finalBasePrompt = sysPromptTemplate.trim()
      ? sysPromptTemplate.replace('{{system_prompt}}', settings.system_prompt || '')
      : settings.system_prompt || 'Você é um Especialista My Way.'

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
      securityClause = `\n- SECURITY CLAUSE: You are a Senior Technical Consultant. You are STRICTLY FORBIDDEN from discussing internal logic, JSON structures, metadata keys, or why a card is or isn't appearing. If a product is relevant, mention it naturally. Your internal engineering is invisible to the user.`
    } else {
      securityClause = `\n- SECURITY CLAUSE: You are communicating with an ADMIN. You may discuss technical internal logic if specifically asked.`
    }

    const sysPrompt = `${finalBasePrompt}${productPageContext}

OPERATIONAL GUIDELINES:
- O nome do cliente é ${userName}.
- ${settings.logisticsRulesPrompt}

Base Institucional:
${compInfo}

Inventário:
${formattedInventory}

${nabContext}

MANDATORY RULES:
- Use ONLY the key referenced_internal_products for product IDs. Do not create other keys for IDs.
- SET-BASED INCLUSION: Se o usuário pedir por uma marca ou categoria/atributo, o array 'referenced_internal_products' DEVE conter TODOS os IDs dos produtos do 'TargetSet' encontrados no inventário, mesmo que não os mencione no texto.
- CONFIDENCE GUARD: Se o 'TargetSet' parecer incompleto em relação ao mercado ou se houver indícios nos INSIGHTS ESTRATÉGICOS de que a marca tem mais itens do que os listados, marque 'confidence_level' como 'low' e ative o botão do WhatsApp.${securityClause}
`

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

    let result: any = null
    let finalWeb = false

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

          let calls = 0
          let usedWeb = false

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
                const gKey = Deno.env.get('GOOGLE_SEARCH_API_KEY')
                const gCx = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
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
                    if (gsRes.ok) {
                      content = ((await gsRes.json()).items || [])
                        .slice(0, 3)
                        .map((i: any) => i.snippet)
                        .join('\n')
                    }
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
      throw new Error('All AI providers failed.')
    }

    if (!result.message && !result.content) {
      result.message = ''
      result.confidence_level = result.confidence_level || 'high'
    } else {
      const msgToCheck = result.message || result.content || ''
      const normalizedMsg = msgToCheck
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const lowConfidenceIndicators = [
        'com os dados que tenho',
        'dados disponiveis',
        'nao encontrei',
        'nao tenho informacao',
        'whatsapp',
        'especialista',
      ]

      let isLowConfidence = lowConfidenceIndicators.some((phrase: string) =>
        normalizedMsg.includes(phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
      )
      result.confidence_level = isLowConfidence ? 'low' : result.confidence_level || 'high'
    }

    let show = false
    let reason = ''

    let refs: string[] = []
    if (Array.isArray(result.referenced_internal_products)) {
      refs = result.referenced_internal_products
        .map((p: any) => (typeof p === 'string' ? p : p.id))
        .filter(Boolean)
    }

    const resolvedRefs = refs
      .map((refId: string) => (productsCtx.find((prod: any) => prod.id === refId) ? refId : null))
      .filter(Boolean)

    const aiMessage = result.message || result.content || ''
    const mentionedIds = new Set<string>(resolvedRefs)

    if (aiMessage) {
      const lowerMsg = aiMessage.toLowerCase()

      const genericWords = new Set([
        'blackmagic',
        'design',
        'sony',
        'canon',
        'panasonic',
        'dji',
        'arri',
        'red',
        'jvc',
        'ptzoptics',
        'marshall',
        'zoom',
        'lens',
        'cable',
        'mount',
        'sensor',
        'digital',
        'optical',
        'camera',
        'video',
        'audio',
        'switch',
        'switcher',
        'converter',
        'adapter',
        'professional',
        'studio',
        'live',
        'production',
        'the',
        'of',
        'and',
        'for',
        'with',
        'a',
        'an',
        'pro',
        'mini',
        'max',
        'plus',
        'ultra',
        'micro',
        'smart',
      ])

      for (const p of productsCtx) {
        if (!mentionedIds.has(p.id)) {
          const nameTerms = (p.name || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
          const skuTerms = (p.sku || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)

          const coreIdentifiers = new Set<string>()

          ;[...nameTerms, ...skuTerms].forEach((term: string) => {
            if (term.length > 1 && !genericWords.has(term)) {
              coreIdentifiers.add(term)
            }
          })

          let matchCount = 0
          for (const term of coreIdentifiers) {
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i')
            if (regex.test(lowerMsg)) {
              matchCount++
            }
          }

          if (coreIdentifiers.size > 0) {
            const requiredMatches = Math.min(2, coreIdentifiers.size)
            if (matchCount >= requiredMatches) {
              if (requiredMatches === 1) {
                const singleMatch = Array.from(coreIdentifiers).find((term: string) => {
                  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerMsg)
                })
                if (singleMatch && singleMatch.length > 2) {
                  mentionedIds.add(p.id)
                }
              } else {
                mentionedIds.add(p.id)
              }
            }
          }
        }
      }
    }

    const finalResolvedRefs = Array.from(mentionedIds)

    const finalProducts = finalResolvedRefs
      .map((refId: string) => {
        const p = productsCtx.find((prod: any) => prod.id === refId)
        if (p) {
          let isRebateActive = false
          let originalPrice = p.price_usd || 0
          let discountedPrice = originalPrice

          if (p.price_usa_rebate > 0 && p.date_rebate) {
            const rebateDate = new Date(p.date_rebate)
            if (rebateDate >= new Date()) {
              isRebateActive = true
              discountedPrice = p.price_usa_rebate
            }
          }

          let discountPercentage = 0
          if (originalPrice > 0 && discountedPrice < originalPrice) {
            discountPercentage = ((originalPrice - discountedPrice) / originalPrice) * 100
          }

          return {
            ...p,
            originalPrice,
            discountedPrice,
            discountPercentage,
            isRebateActive,
          }
        }
        return null
      })
      .filter(Boolean)

    if (
      finalResolvedRefs.length === 0 ||
      result.confidence_level === 'low' ||
      (result.message &&
        (result.message.toLowerCase().includes('whatsapp') ||
          result.message.toLowerCase().includes('especialista')))
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
      finalResolvedRefs.length > 0 &&
      productsCtx.some(
        (p: any) => finalResolvedRefs.includes(p.id) && (p.price_usd || 0) > settings.price,
      )
    ) {
      show = true
      reason = 'Produto premium. Especialista pode oferecer condições especiais.'
    } else if (finalResolvedRefs.length >= 3) {
      show = true
      reason = 'Múltiplos produtos. Especialista pode montar solução integrada.'
    }

    result.should_show_whatsapp_button = show || !!result.should_show_whatsapp_button
    result.whatsapp_reason = show ? reason : result.whatsapp_reason || ''
    result.used_web_search = finalWeb
    result.price_context = 'fob_miami'
    result.referenced_internal_products = finalResolvedRefs
    result.products = finalProducts
    result.has_nab_intelligence = hasNabIntelligence

    const targetSetIncomplete =
      result.message?.toLowerCase().includes('incompleto') || result.confidence_level === 'low'

    if (
      result.confidence_level === 'high' &&
      finalResolvedRefs.length > 0 &&
      !targetSetIncomplete
    ) {
      let cacheProductName = actualQuery
      const firstRefProd = productsCtx.find((p: any) => p.id === finalResolvedRefs[0])
      if (firstRefProd) {
        cacheProductName = firstRefProd.sku || firstRefProd.name
      }

      supabase
        .from('product_search_cache')
        .insert({
          search_query: actualQuery,
          product_name: cacheProductName,
          source: 'ai_generated',
          product_description: result.message,
          product_specs: result,
        })
        .then()
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
