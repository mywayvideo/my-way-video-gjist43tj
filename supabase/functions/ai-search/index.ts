import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('Query is required')
    }

    let actualQuery = query
    const userQueryMatch = query.match(/User Query: (.*)/)
    if (userQueryMatch) {
      actualQuery = userQueryMatch[1]
    }

    const qL = actualQuery.toLowerCase()
    const bypassCache =
      qL.includes('nab') || qL.includes('novidades') || qL.includes('feira') || qL.includes('2026')

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
      logisticsRulesPrompt: aiSettings?.logistics_rules_prompt || '',
    }

    const safeQueryForOr = actualQuery.replace(/[%_,()[\]{}"'\\]/g, ' ')
    const qTerms = safeQueryForOr
      .toLowerCase()
      .split(/\s+/)
      .filter((t: string) => t.length > 2)
    const orQuery =
      qTerms.length > 0
        ? qTerms
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

    const productOrQuery =
      qTerms.length > 0
        ? qTerms
            .map((t: string) => `name.ilike.%${t}%,category.ilike.%${t}%,sku.ilike.%${t}%`)
            .join(',')
        : `name.ilike.%${safeQueryForOr}%,category.ilike.%${safeQueryForOr}%,sku.ilike.%${safeQueryForOr}%`

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
    if (settings.ignore_stock_count === false) {
      productsCtx = productsCtx.filter((p: any) => (p.stock || 0) > 0)
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

    const fallbackPrompt = 'Consultor My Way Business. Responda de forma técnica e objetiva.'
    let basePrompt = settings.systemPromptTemplate
    if (!basePrompt || basePrompt.trim() === '') {
      basePrompt = fallbackPrompt
    }

    const constraintPrompt = `
MANDATORY RULES:
- The AI MUST respond in the EXACT same language used in the user's last message.
- The AI is FORBIDDEN from comparing products unless the user explicitly asks for a comparison.
- All technical specifications MUST be in code blocks with triple backticks.
- Convert all database logic into natural, professional commercial sentences. Do NOT output database field names (e.g., price_usd, stock_count) or logical conditions.
- Paragraphs: Maximum 2 sentences.
- Regras Logísticas: ${settings.logisticsRulesPrompt}
- Retorne em "referenced_internal_products" TODOS os IDs dos produtos mencionados.

Retorne APENAS um objeto JSON com:
{
  "message": "Sua resposta técnica seguindo as regras",
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

    const qL = actualQuery.toLowerCase()
    let show = false,
      reason = ''
    const refs = Array.isArray(result.referenced_internal_products)
      ? result.referenced_internal_products
      : []

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
          return p
        }
        return null
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
    })
  } catch (err: any) {
    console.error('Fatal ai-search error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno na Edge Function' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
