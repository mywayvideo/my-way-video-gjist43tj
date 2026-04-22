import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  const startTime = Date.now()
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
    const sessionId = body.session_id || crypto.randomUUID()

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new Response(JSON.stringify({ 
        status: 'error', message: 'A consulta (query) é obrigatória.', error_code: 'MISSING_QUERY'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Read Trigger Settings on each request
    let aiAgentSettings: any = null;
    let aiSettings: any = null;
    try {
        const [{ data: agentSet }, { data: genSet }] = await Promise.all([
            supabaseAdmin.from('ai_agent_settings').select('*').limit(1).maybeSingle(),
            supabaseAdmin.from('ai_settings').select('*').limit(1).maybeSingle()
        ]);
        if (agentSet) aiAgentSettings = agentSet;
        if (genSet) aiSettings = genSet;
    } catch (e) {
        console.error("Error fetching settings", e);
    }

    const evaluateWhatsAppTriggers = async (responseText: string, refs: string[], confidenceLevel: string) => {
        let showBtn = false;
        if (!aiAgentSettings) return showBtn;

        const triggerLowConf = aiAgentSettings.whatsapp_trigger_low_confidence;
        const triggerPurchase = aiAgentSettings.whatsapp_trigger_purchase_keywords;
        const triggerProject = aiAgentSettings.whatsapp_trigger_project_keywords;
        const triggerExpensive = aiAgentSettings.whatsapp_trigger_expensive_product;
        const priceThreshold = aiSettings?.price_threshold_usd ?? 5000;

        if (triggerLowConf && confidenceLevel === 'low') {
            showBtn = true;
        }

        const normalizedResponse = responseText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (triggerPurchase && !showBtn) {
            const purchaseKeywords = aiAgentSettings?.whatsapp_trigger_keywords || [];
            if (purchaseKeywords.some((kw: string) => normalizedResponse.includes(kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
                showBtn = true;
            }
        }

        if (triggerProject && !showBtn) {
            const projectKeywords = aiAgentSettings?.whatsapp_trigger_keywords || [];
            if (projectKeywords.some((kw: string) => normalizedResponse.includes(kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
                showBtn = true;
            }
        }

        if (triggerExpensive && !showBtn && refs && refs.length > 0) {
            try {
                const { data: expensiveProducts } = await supabaseAdmin
                    .from('products')
                    .select('price_usd')
                    .in('id', refs);
                    
                if (expensiveProducts && expensiveProducts.some((p: any) => (p.price_usd || 0) > priceThreshold)) {
                    showBtn = true;
                }
            } catch (e) {}
        }

        return showBtn;
    };

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

    // Fetch Products for Semantic Match (Include is_discontinued)
    let allProducts: any[] = []
    try {
      const { data: prodData } = await supabaseAdmin.from('products').select('id, name, sku, category, price_usd, price_cost, price_nationalized_sales, price_nationalized_cost, price_nationalized_currency, weight, category_id, manufacturer_id, image_url, is_discontinued, stock')
      if (prodData) {
        allProducts = prodData
        if (aiSettings && aiSettings.ignore_stock_count === false) {
           allProducts = allProducts.filter((p: any) => (p.stock || 0) > 0)
        }
      }
    } catch (e) {}

    // Multi-Provider Fallback Logic
    const { data: providers, error: provError } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (provError || !providers || providers.length === 0) {
      console.log(`[${new Date().toISOString()}] No active providers found. Query: ${query.trim()}`);
      const should_show_whatsapp_button = await evaluateWhatsAppTriggers("", [], "low");
      return new Response(JSON.stringify({
        confidence_level: "low",
        message: "Desculpe, nao consegui processar sua pergunta agora. Tente novamente em alguns instantes ou entre em contato conosco.",
        should_show_whatsapp_button,
        referenced_internal_products: []
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const defaultSystemPrompt = "Consultor My Way Business. Responda de forma técnica e objetiva.";

    let dbSystemPrompt = aiAgentSettings?.system_prompt;
    if (!dbSystemPrompt || dbSystemPrompt.trim() === '') {
       dbSystemPrompt = defaultSystemPrompt;
    }

    const formattingRules = `\n\nRESPONSE FORMAT RULES (MANDATORY):
1. The AI MUST respond in the EXACT same language used in the user's last message.
2. The AI is FORBIDDEN from comparing products unless the user explicitly asks for a comparison.
3. All technical specifications MUST be in code blocks with triple backticks.
4. Convert all database logic into natural, professional commercial sentences. Do NOT output database field names (e.g., price_usd, stock_count) or logical conditions.
5. Paragraphs: Maximum 2 sentences.`;

    const baseSystemPrompt = dbSystemPrompt + historyContext + formattingRules
    
    let success = false
    let responseText = ""
    let successfulProviderName = ""
    let lastResponseText = ""

    for (const provider of providers) {
      if (Date.now() - startTime > 30000) {
        console.log(`[${new Date().toISOString()}] Total request timeout exceeded (30s). Query: ${query.trim()}`);
        break;
      }

      const pType = provider.provider_type || provider.provider_name
      const apiKey = Deno.env.get(provider.api_key_secret_name)
      
      if (!apiKey && pType !== 'custom') continue

      let attempt = 0
      const maxAttempts = 3
      const backoffDelays = [2000, 4000, 8000]

      while (attempt < maxAttempts && !success) {
        if (Date.now() - startTime > 30000) {
          console.log(`[${new Date().toISOString()}] Total request timeout exceeded (30s). Query: ${query.trim()}`);
          break;
        }

        try {
          let currentPrompt = baseSystemPrompt
          if (attempt > 0 && lastResponseText) {
             currentPrompt += "\n\nCRITICAL WARNING: Your last response failed to follow the STRICT formatting rules. Please rewrite."
          }

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)

          try {
            responseText = await callAIProvider(pType, provider.custom_endpoint, provider.model_id, apiKey || '', currentPrompt, query.trim(), controller.signal)
          } finally {
            clearTimeout(timeoutId)
          }

          lastResponseText = responseText

          // Removed arbitrary formatting validation

          success = true
          successfulProviderName = provider.provider_name
        } catch (error: any) {
          const isAbortError = error?.name === 'AbortError' || error?.message?.includes('Abort')
          const status = error?.status || (isAbortError ? 408 : 500)
          const errorMessage = isAbortError ? 'Provider request timed out (10s)' : (error?.message || 'Unknown error')
          
          if (isAbortError) {
             console.log(`[${new Date().toISOString()}] Provider request timed out (10s). Query: ${query.trim()}`);
          }
          console.log(`[${new Date().toISOString()}] provider_type: ${pType}, provider_name: ${provider.provider_name}, error_status: ${status}, error_message: ${errorMessage}`);
          
          attempt++
          
          if (isAbortError) {
            break // Skip to next provider
          }

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
        let matchedProducts: any[] = []
        try {
            const responseTextLower = responseText.toLowerCase()
            const tsLog = new Date().toISOString()

            console.log(`[${tsLog}] Response text: ${responseText}`);
            console.log(`[${tsLog}] Total products in database: ${allProducts.length}`);
            if (allProducts.length > 0) {
                const first5 = allProducts.slice(0, 5).map(p => `${p.name} (${p.category || 'none'})`).join(', ');
                console.log(`[${tsLog}] First 5 products: ${first5}`);
            }

            // 1. & 2. Extract semantic context from response
            const contextKeywords = [
                'camera', 'câmera', 'video', 'vídeo', 'cinema', 'filming', 
                'gravação', 'gravacao', 'recording', 'codec', 'frame rate', 
                'resolução', 'resolucao', 'sensor', 'lens', 'lente', 
                'tripod', 'tripé', 'tripe', 'monitor', 'stabilization', 
                'estabilização', 'estabilizacao', 'lighting', 'iluminação', 
                'iluminacao', 'audio', 'áudio', 'battery', 'bateria', 
                'recorder', 'gravador', 'sdi', 'hdmi', 'capture', 'placa', 'decklink'
            ];
            const foundContexts = contextKeywords.filter(kw => responseTextLower.includes(kw));
            console.log(`[${tsLog}] Semantic contexts found: [${foundContexts.join(', ')}]`);

            const matchedProductsRaw: any[] = [];

            // 3. For each product in database
            for (const product of allProducts) {
                if (!product.name) continue;
                
                const pName = product.name.toLowerCase().trim();
                const pCat = (product.category || '').toLowerCase().trim();

                // Build aliases
                const aliases = new Set<string>();
                aliases.add(pName); // Full name

                const words = pName.split(/[\s\-,()]+/).filter((w: string) => w.length > 0);
                if (words.length > 1) {
                    const brand = words[0];
                    const models = words.slice(1);
                    
                    for (const m of models) {
                        if (m.length >= 2) {
                            aliases.add(m); // Just model (e.g., FX3A)
                            aliases.add(`${brand} ${m}`); // Brand + model
                            
                            // Suffix removal (e.g., FX3A -> FX3)
                            if (/\d/.test(m) && /[a-z]+$/i.test(m)) {
                                const baseM = m.replace(/[a-z]+$/i, '');
                                if (baseM.length >= 2) {
                                    aliases.add(baseM);
                                    aliases.add(`${brand} ${baseM}`);
                                }
                            }
                        }
                    }
                }

                // Check if any alias is mentioned
                let aliasMatched = false;
                let matchedAliasStr = "";
                
                for (const alias of aliases) {
                    if (alias.length < 2) continue;
                    
                    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const tokenRegex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
                    
                    if (tokenRegex.test(responseTextLower)) {
                        aliasMatched = true;
                        matchedAliasStr = alias;
                        break;
                    }
                }

                // Check semantic context match
                let contextMatched = false;
                
                // Define broader contexts for product category
                const pContexts = [pCat];
                if (pCat.includes('camera') || pCat.includes('câmera') || pCat.includes('video') || pCat.includes('cinema')) {
                    pContexts.push('camera', 'câmera', 'video', 'vídeo', 'cinema', 'codec', 'frame rate', 'resolucao', 'resolução', 'sensor', 'gravação', 'gravacao');
                }
                if (pCat.includes('lens') || pCat.includes('lente')) {
                    pContexts.push('lens', 'lente', 'sensor');
                }
                if (pCat.includes('audio') || pCat.includes('áudio') || pCat.includes('microfone') || pCat.includes('mic')) {
                    pContexts.push('audio', 'áudio', 'recorder', 'gravador', 'recording');
                }
                if (pCat.includes('iluminacao') || pCat.includes('iluminação') || pCat.includes('luz')) {
                    pContexts.push('lighting', 'iluminação', 'iluminacao');
                }
                if (pCat.includes('suporte') || pCat.includes('trip') || pCat.includes('estabiliza')) {
                    pContexts.push('tripod', 'tripé', 'tripe', 'stabilization', 'estabilização', 'estabilizacao');
                }
                if (pCat.includes('placa') || pCat.includes('capture') || pCat.includes('video') || pCat.includes('interface')) {
                    pContexts.push('sdi', 'hdmi', 'capture', 'video', 'placa');
                }

                // If conversation has no context keywords, we assume it matches (fallback)
                if (foundContexts.length === 0) {
                    contextMatched = true;
                } else {
                    // Check intersection
                    contextMatched = pContexts.some(pc => foundContexts.includes(pc));
                    // Allow match if category is empty but alias was an explicit hit
                    if (pCat === '') contextMatched = true; 
                }

                if (aliasMatched && contextMatched) {
                    matchedProductsRaw.push(product);
                }
            }

            // 5. Combine and deduplicate, limit to 10
            const uniqueIds = new Set<string>();
            for (const p of matchedProductsRaw) {
                if (!uniqueIds.has(p.id)) {
                    uniqueIds.add(p.id);
                    matchedProducts.push(p);
                    if (matchedProducts.length >= 10) break;
                }
            }

        } catch (err) {
            console.error("[Semantic Context] Error matching products:", err);
            // Error handling: gracefully degrade, returning empty matchedProducts
        }

        try {
          await supabaseAdmin.from('conversation_history').insert({
            user_id: authUser?.id || null, session_id: sessionId, query: query.trim(), response: responseText
          })
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          supabaseAdmin.from('conversation_history').delete().lt('created_at', yesterday).then()
        } catch (e) {}

        const refIds = matchedProducts.map(p => p.id);
        
        let finalConfidence = "high";
        const normalizedForTrigger = responseText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalizedForTrigger.includes('suporte') || normalizedForTrigger.includes('especialista') || normalizedForTrigger.includes('equipe')) {
            finalConfidence = "low";
        }

        let should_show_whatsapp_button = await evaluateWhatsAppTriggers(responseText, refIds, finalConfidence);
        
        if (finalConfidence === "low") {
            should_show_whatsapp_button = true;
        }

        // 6. Return in response JSON
        return new Response(JSON.stringify({
          status: "success",
          provider_name: successfulProviderName,
          confidence_level: finalConfidence,
          response: responseText,
          query: query.trim(),
          session_id: sessionId,
          referenced_internal_products: matchedProducts,
          should_show_whatsapp_button
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // All Providers Failed or Timeout
    const should_show_whatsapp_button_fallback = await evaluateWhatsAppTriggers("", [], "low");
    return new Response(JSON.stringify({
      confidence_level: "low",
      message: "Desculpe, nao consegui processar sua pergunta agora. Tente novamente em alguns instantes ou entre em contato conosco.",
      should_show_whatsapp_button: should_show_whatsapp_button_fallback,
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
  userPrompt: string,
  signal?: AbortSignal
): Promise<string> {
  if (providerType === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
      }),
      signal
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
      }),
      signal
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
      }),
      signal
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
      body: JSON.stringify(body),
      signal
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
