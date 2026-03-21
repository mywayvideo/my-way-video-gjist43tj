import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Request received`)

  try {
    const authHeader = req.headers.get('Authorization')
    const hasAuthHeader = !!authHeader
    
    let isTokenValid = false
    let authUser: any = null

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (hasAuthHeader) {
      const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser()
      if (!authError && user) {
        isTokenValid = true
        authUser = user
      }
    }

    let body;
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ 
        status: 'error', message: 'Corpo da requisição inválido.', error_code: 'INVALID_REQUEST_BODY'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const query = body.query
    const includeCache = body.include_cache !== undefined ? Boolean(body.include_cache) : true
    const sessionId = body.session_id || crypto.randomUUID()

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new Response(JSON.stringify({ 
        status: 'error', message: 'A consulta (query) é obrigatória.', error_code: 'MISSING_QUERY'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Old Cache Logic (Backward compatibility)
    if (includeCache) {
      const { data: cacheHit } = await supabaseAdmin
        .from('product_search_cache')
        .select('*')
        .eq('search_query', query.trim())
        .limit(1)
        .maybeSingle()

      if (cacheHit) {
        supabaseAdmin.from('conversation_history').insert({
          user_id: authUser?.id || null, session_id: sessionId, query: query.trim(), response: `Cache Hit: ${cacheHit.product_name}`
        }).then()

        return new Response(JSON.stringify({
          status: "cache_hit",
          source: "product_search_cache",
          product_name: cacheHit.product_name,
          product_description: cacheHit.product_description,
          product_price: cacheHit.product_price,
          product_currency: cacheHit.product_currency,
          product_specs: cacheHit.product_specs || {},
          session_id: sessionId,
          referenced_internal_products: []
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // New Cache Lookup Logic (product_cache)
    if (includeCache) {
      const { data: productCacheHit } = await supabaseAdmin
        .from('product_cache')
        .select('product_specs')
        .ilike('product_name', query.trim())
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()

      if (productCacheHit && productCacheHit.product_specs) {
        console.log(`[${new Date().toISOString()}] Cache hit for query: ${query.trim()}`);
        const cachedResponse = (productCacheHit.product_specs as any).response || JSON.stringify(productCacheHit.product_specs);
        return new Response(JSON.stringify({
          status: "success",
          provider_name: "cache",
          confidence_level: "high",
          response: cachedResponse,
          query: query.trim(),
          session_id: sessionId,
          referenced_internal_products: []
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Fetch Conversation History
    let historyContext = ""
    try {
      const { data: historyData } = await supabaseAdmin
        .from('conversation_history')
        .select('query, response')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5)
      if (historyData && historyData.length > 0) {
        historyContext = "\n\nPrevious conversation:\n" + historyData.reverse().map((h: any) => `[User: ${h.query}] [Assistant: ${h.response}]`).join('\n')
      }
    } catch (e) {}

    // Fetch Products for Semantic Match
    let allProducts: any[] = []
    try {
      const { data: prodData } = await supabaseAdmin.from('products').select('id, name, sku, category')
      if (prodData) allProducts = prodData
    } catch (e) {}

    const productSemanticDefinitions = [
        { category: 'camera', keywords: ['camera', 'câmera', 'video', 'vídeo', 'cinema', 'filming', 'filmagem', 'recording', 'gravação'] },
        { category: 'tripod', keywords: ['tripod', 'tripé', 'stand', 'suporte', 'support', 'stabilization', 'estabilização', 'cabeça', 'head'] },
        { category: 'monitor', keywords: ['monitor', 'display', 'screen', 'tela', 'output', 'saída'] },
        { category: 'lens', keywords: ['lens', 'lente', 'ótica', 'optics', 'zoom', 'prime', 'focal'] },
        { category: 'battery', keywords: ['battery', 'bateria', 'power', 'energia', 'charger', 'carregador', 'v-mount', 'baterias'] },
        { category: 'audio', keywords: ['audio', 'áudio', 'mic', 'microfone', 'sound', 'som', 'recorder', 'gravador'] },
        { category: 'lighting', keywords: ['light', 'luz', 'iluminação', 'lighting', 'led', 'fresnel', 'painel'] },
        { category: 'switcher', keywords: ['switcher', 'misturador', 'corte', 'switch', 'atem', 'produção'] },
        { category: 'capture', keywords: ['capture', 'captura', 'decklink', 'placa', 'pci'] },
        { category: 'accessory', keywords: ['accessory', 'acessório', 'cable', 'cabo', 'rig', 'cage', 'equipamento'] },
    ]

    const productMap = allProducts.map(p => {
        let category = 'accessory'
        let semantic_context = productSemanticDefinitions.find(d => d.category === 'accessory')!.keywords
        const n = (p.name || '').toLowerCase()
        const c = (p.category || '').toLowerCase()
        const combined = `${n} ${c}`

        for (const def of productSemanticDefinitions) {
            if (def.keywords.some(k => combined.includes(k))) {
                category = def.category; semantic_context = def.keywords; break;
            }
        }

        const aliases = new Set<string>()
        if (p.name) aliases.add(p.name.toLowerCase().trim())
        if (p.sku) {
            aliases.add(p.sku.toLowerCase().trim())
            if (p.sku.includes('-')) aliases.add(p.sku.replace(/-/g, '').toLowerCase().trim())
        }
        
        const words = n.split(/[\s\-,()]+/).filter((w: string) => w.trim().length > 0)
        const brand = words[0] || ''
        
        words.forEach((w: string) => {
            if (w.length >= 3 && /\d/.test(w)) {
                aliases.add(w)
                if (brand && brand.toLowerCase() !== w.toLowerCase()) aliases.add(`${brand.toLowerCase()} ${w}`)
            }
        })
        return { id: p.id, name: p.name, aliases: Array.from(aliases).sort((a, b) => b.length - a.length), category, semantic_context }
    })

    // Multi-Provider Fallback Logic
    const { data: providers, error: provError } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (provError || !providers || providers.length === 0) {
      return new Response(JSON.stringify({
        confidence_level: "low",
        message: "Desculpe, nao consegui processar sua pergunta agora. Tente novamente em alguns instantes ou entre em contato conosco.",
        should_show_whatsapp_button: true,
        referenced_internal_products: []
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const formattingRules = `\n\nRESPONSE FORMAT RULES (MANDATORY):
You MUST format every response with MAXIMUM clarity and visual hierarchy.
Use this exact structure:
1. DIRECT ANSWER (first line, bold key terms):
   Start with 1-2 sentences answering the question directly. Bold critical information using **text** format.
2. NUMBERED SECTIONS (if multiple topics):
   Use format: **1. Section Title** Then bullet points (max 3-4 per section).
3. CRITICAL REQUIREMENTS (if applicable):
   Use format: **Requisitos Críticos:** Then bullet points.
4. RECOMMENDED BRANDS (if applicable):
   Use format: **Marcas Recomendadas:** Then bullet points.
5. FINAL RECOMMENDATION (always end with this):
   Use format: **Recomendação Final:** Then 1-2 sentences.
FORMATTING RULES: NEVER write paragraphs longer than 2 lines. ALWAYS break long text into bullets. ALWAYS separate sections with blank lines.`

    const baseSystemPrompt = "You are an expert in professional audiovisual equipment" + historyContext + formattingRules
    
    let success = false
    let responseText = ""
    let successfulProviderName = ""
    let lastResponseText = ""

    for (const provider of providers) {
      const pType = provider.provider_type || provider.provider_name
      const apiKey = Deno.env.get(provider.api_key_secret_name)
      
      if (!apiKey && pType !== 'custom') continue

      let attempt = 0
      const maxAttempts = 3
      const backoffDelays = [2000, 4000, 8000]

      while (attempt < maxAttempts && !success) {
        try {
          let currentPrompt = baseSystemPrompt
          if (attempt > 0 && lastResponseText) {
             currentPrompt += "\n\nCRITICAL WARNING: Your last response failed to follow the STRICT formatting rules. Please rewrite."
          }

          responseText = await callAIProvider(pType, provider.custom_endpoint, provider.model_id, apiKey || '', currentPrompt, query.trim())
          lastResponseText = responseText

          const hasBolds = responseText.includes('**')
          const hasBullets = responseText.includes('- ')
          const hasLineBreaks = responseText.includes('\n\n')

          if (!hasBolds || (!hasBullets && !hasLineBreaks && responseText.length > 200)) {
            throw { status: 422, message: "Response formatting validation failed" }
          }

          success = true
          successfulProviderName = provider.provider_name
        } catch (error: any) {
          const status = error?.status || 500
          const errorMessage = error?.message || 'Unknown error'
          console.log(`[${new Date().toISOString()}] provider_type: ${pType}, provider_name: ${provider.provider_name}, error_status: ${status}, error_message: ${errorMessage}`);
          
          attempt++
          
          if (status === 401 || status === 403 || status === 400 || status === 404) {
            break // Fatal errors, skip to next provider
          }

          if (status === 503) {
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt - 1]))
            }
          } else {
            if (status === 422 && lastResponseText) {
                if (attempt >= maxAttempts) {
                   responseText = lastResponseText
                   success = true
                   successfulProviderName = provider.provider_name
                   break
                }
            } else {
               break // Break on other errors (500, etc) and move to next provider
            }
          }
        }
      }
      if (success) break
    }

    if (success) {
        let referenced_internal_products: string[] = []
        try {
            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const allTextLower = `${query} ${responseText}`.toLowerCase()
            const allWords = allTextLower.split(/[\s,.;:!?'"()\[\]{}]+/).filter((w: string) => w.length > 0)

            const foundContexts = new Set<string>()
            allWords.forEach((w: string) => {
                for (const def of productSemanticDefinitions) {
                    if (def.keywords.includes(w)) foundContexts.add(w)
                }
            })
            
            const combinedContexts = Array.from(foundContexts)
            const matchedIds = new Set<string>()

            productMap.forEach(prod => {
                let isMentioned = false
                for (const alias of prod.aliases) {
                    if (alias.length < 2) continue
                    const boundary = `(^|[\\s,.;:!?'"()\\[\\]{}<>-])`
                    const regex = new RegExp(`${boundary}${escapeRegExp(alias)}${boundary}`, 'i')
                    if (regex.test(allTextLower)) {
                        isMentioned = true; break;
                    }
                }
                
                if (isMentioned) {
                    const contextMatch = prod.semantic_context.some(ctx => combinedContexts.includes(ctx))
                    if (contextMatch || combinedContexts.length === 0) matchedIds.add(prod.id)
                }
            })
            referenced_internal_products = Array.from(matchedIds).slice(0, 10)
        } catch (err) {}

        try {
          await supabaseAdmin.from('conversation_history').insert({
            user_id: authUser?.id || null, session_id: sessionId, query: query.trim(), response: responseText
          })
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          supabaseAdmin.from('conversation_history').delete().lt('created_at', yesterday).then()
        } catch (e) {}

        try {
            const { data: settings } = await supabaseAdmin.from('ai_agent_settings').select('cache_expiration_days').limit(1).maybeSingle();
            const expDays = settings?.cache_expiration_days || 30;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expDays);

            await supabaseAdmin.from('product_cache').insert({
                product_name: query.trim(),
                product_specs: { response: responseText },
                source: 'web_search',
                cached_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                user_id: authUser?.id || null
            }).then();
            console.log(`[${new Date().toISOString()}] Cache insert for query: ${query.trim()}`);
        } catch (e) {}

        return new Response(JSON.stringify({
          status: "success",
          provider_name: successfulProviderName,
          confidence_level: "high",
          response: responseText,
          query: query.trim(),
          session_id: sessionId,
          referenced_internal_products
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // All Providers Failed
    return new Response(JSON.stringify({
      confidence_level: "low",
      message: "Desculpe, nao consegui processar sua pergunta agora. Tente novamente em alguns instantes ou entre em contato conosco.",
      should_show_whatsapp_button: true,
      referenced_internal_products: []
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({
      confidence_level: "low",
      message: "Desculpe, nao consegui processar sua pergunta agora. Tente novamente em alguns instantes ou entre em contato conosco.",
      should_show_whatsapp_button: true,
      referenced_internal_products: []
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function callAIProvider(
  providerType: string,
  customEndpoint: string | null,
  modelId: string, 
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
  if (providerType === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
      })
    })
    if (!res.ok) throw { status: res.status, message: await res.text() }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  if (providerType === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Instruções de Sistema:\n${systemPrompt}\n\nConsulta do Usuário:\n${userPrompt}` }] }]
      })
    })
    if (!res.ok) throw { status: res.status, message: await res.text() }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  if (providerType === 'deepseek') {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
      })
    })
    if (!res.ok) throw { status: res.status, message: await res.text() }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  if (providerType === 'custom') {
    if (!customEndpoint) throw { status: 400, message: "Custom endpoint missing" }
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
    
    let body: any = {
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    }

    if (customEndpoint.includes('anthropic.com')) {
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
      body = {
        model: modelId,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      }
    }

    const res = await fetch(customEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) throw { status: res.status, message: await res.text() }
    const data = await res.json()
    
    if (customEndpoint.includes('anthropic.com')) {
      return data.content?.[0]?.text || ''
    }
    
    return data.choices?.[0]?.message?.content || data.response || ''
  }

  throw { status: 400, message: `Provedor ${providerType} não reconhecido ou não suportado.` }
}
