import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Request received`)

  try {
    // 1. Optional Authentication Check
    const authHeader = req.headers.get('Authorization')
    const hasAuthHeader = !!authHeader
    console.log(`Auth header present: ${hasAuthHeader ? 'yes' : 'no'}`)

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

      if (authError || !user) {
        console.error('Auth verification failed:', authError?.message || 'No user found')
      } else {
        isTokenValid = true
        authUser = user
      }
    }

    console.log(`Token valid: ${isTokenValid ? 'yes' : 'no'}`)

    // 2. Payload Validation
    let body;
    try {
      body = await req.json()
    } catch (e) {
      console.log('Response status: error')
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Corpo da requisição inválido.',
        error_code: 'INVALID_REQUEST_BODY'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const query = body.query
    const includeCache = body.include_cache !== undefined ? Boolean(body.include_cache) : true
    const sessionId = body.session_id || crypto.randomUUID()

    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.log('Response status: error')
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'A consulta (query) é obrigatória.',
        error_code: 'MISSING_QUERY'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Query received: ${query.trim()}`)

    // Admin client to bypass RLS for reading cache and providers, and inserting history
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 3. Cache Logic (Step 1)
    if (includeCache) {
      const { data: cacheHit, error: cacheError } = await supabaseAdmin
        .from('product_search_cache')
        .select('*')
        .eq('search_query', query.trim())
        .limit(1)
        .maybeSingle()

      if (!cacheError && cacheHit) {
        console.log('Response status: success')
        
        // Background history insert for cache
        supabaseAdmin.from('conversation_history').insert({
          user_id: authUser?.id || null,
          session_id: sessionId,
          query: query.trim(),
          response: `Cache Hit: ${cacheHit.product_name}`
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
          referenced_internal_products: [] // Cache hits don't currently parse references
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 4. Fetch Conversation History for Context
    let historyContext = ""
    try {
      const { data: historyData, error: historyError } = await supabaseAdmin
        .from('conversation_history')
        .select('query, response')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!historyError && historyData && historyData.length > 0) {
        const chronological = historyData.reverse()
        historyContext = "\n\nPrevious conversation:\n" + chronological.map((h: any) => `[User: ${h.query}] [Assistant: ${h.response}]`).join('\n')
      }
    } catch (e) {
      console.error("History fetch error:", e)
    }

    // 5. Fetch Products and Build Strict Lookup Map
    let allProducts: any[] = []
    try {
      const { data: prodData, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('id, name, sku, category')
      
      if (!prodErr && prodData) {
        allProducts = prodData
      }
    } catch (e) {
      console.error("Failed to fetch products for lookup:", e)
    }

    const productMap = allProducts.map(p => {
      const aliases = new Set<string>()
      const n = (p.name || '').toLowerCase().trim()
      
      if (n) {
        aliases.add(n)
        if (n.includes('-')) {
          aliases.add(n.replace(/-/g, ''))
          aliases.add(n.replace(/-/g, ' '))
        }
      }
      
      let skuLower = null
      if (p.sku) {
        skuLower = p.sku.toLowerCase().trim()
        if (skuLower) {
          aliases.add(skuLower)
          if (skuLower.includes('-')) {
              aliases.add(skuLower.replace(/-/g, ''))
          }
        }
      }

      // Add specific model identifiers (words with numbers) to prevent generic matches like "camera" or "monitor"
      const words = n.split(/[\s-]+/)
      words.forEach(word => {
        if (word.length >= 3 && /\d/.test(word)) {
           aliases.add(word)
        }
      })
      
      // Add bigrams that contain numbers
      for (let i = 0; i < words.length - 1; i++) {
          const bigram = `${words[i]} ${words[i+1]}`
          if (/\d/.test(words[i]) || /\d/.test(words[i+1])) {
              aliases.add(bigram)
          }
      }

      return {
        id: p.id,
        name: p.name,
        aliases: Array.from(aliases)
      }
    })

    // 6. Multi-Provider Fallback Logic
    const { data: providers, error: provError } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (provError || !providers || providers.length === 0) {
      console.log('Response status: error')
      return new Response(JSON.stringify({
        status: "error",
        message: "Nenhum provedor de IA disponível no momento. Tente novamente em alguns instantes.",
        error_code: "NO_PROVIDERS_AVAILABLE",
        attempted_providers: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const formattingRules = `\n\nRESPONSE FORMAT RULES (MANDATORY):
You MUST format every response with MAXIMUM clarity and visual hierarchy.
Use this exact structure:

1. DIRECT ANSWER (first line, bold key terms):
   Start with 1-2 sentences answering the question directly.
   Bold critical information using **text** format.

2. NUMBERED SECTIONS (if multiple topics):
   Use format: **1. Section Title**
   Then bullet points (max 3-4 per section).
   Separate sections with blank line.

3. CRITICAL REQUIREMENTS (if applicable):
   Use format: **Requisitos Críticos:**
   Then bullet points.

4. RECOMMENDED BRANDS (if applicable):
   Use format: **Marcas Recomendadas:**
   Then bullet points with brief explanation.

5. FINAL RECOMMENDATION (always end with this):
   Use format: **Recomendação Final:**
   Then 1-2 sentences summarizing the best option.

FORMATTING RULES:
- NEVER write paragraphs longer than 2 lines.
- ALWAYS break long text into bullets.
- ALWAYS bold critical information (capacities, specs, safety items).
- ALWAYS separate sections with blank lines.
- NEVER use markdown headers (###). Use bold titles instead.
- NEVER mix bullets with paragraphs in same section.

Example response structure:
**Direct Answer:** The Sachtler 1018AM is adequate for Sony Burano with specific conditions.

**1. Capacity Assessment**
- Payload capacity: 18kg (meets Burano 8-12kg requirement)
- Includes safety margin of 1.5x

**2. Critical Requirements for Burano**
- Fluid head with independent drag control
- Counterbalance system
- Scale markings for pan/tilt

**Recomendação Final:** The Sachtler 1018AM is an excellent choice for Burano. Ensure drag and counterbalance are properly calibrated.`

    const baseSystemPrompt = "You are an expert in professional audiovisual equipment" + historyContext + formattingRules
    const attemptedProviders: string[] = []

    for (const provider of providers) {
      attemptedProviders.push(provider.provider_name)
      const apiKey = Deno.env.get(provider.api_key_secret_name)
      
      if (!apiKey) {
        console.warn(`API Key ausente para o provedor: ${provider.provider_name}`)
        continue
      }

      console.log(`AI provider selected: ${provider.provider_name}`)

      let attempt = 0
      const maxAttempts = 3
      const backoffDelays = [2000, 4000, 8000] // 2s, 4s, 8s
      let success = false
      let responseText = ""
      let lastResponseText = ""

      while (attempt < maxAttempts && !success) {
        try {
          let currentPrompt = baseSystemPrompt
          if (attempt > 0 && lastResponseText) {
             currentPrompt += "\n\nCRITICAL WARNING: Your last response failed to follow the STRICT formatting rules. You MUST use **bold titles**, bullet points (-), and keep paragraphs under 2 lines. Please rewrite your previous answer with the correct formatting."
          }

          responseText = await callAIProvider(provider.provider_name, provider.model_id, apiKey, currentPrompt, query.trim())
          lastResponseText = responseText

          // Validate basic formatting heuristically
          const hasBolds = responseText.includes('**')
          const hasBullets = responseText.includes('- ')
          const hasLineBreaks = responseText.includes('\n\n')

          if (!hasBolds || (!hasBullets && !hasLineBreaks && responseText.length > 200)) {
            throw { status: 422, message: "Response formatting validation failed" }
          }

          success = true
        } catch (error: any) {
          attempt++
          const status = error?.status || 500
          
          console.error(`Falha no provedor ${provider.provider_name} (Tentativa ${attempt}/${maxAttempts}): HTTP ${status}`)

          if (status === 400 || status === 401 || status === 404) {
            break // Fatal errors, don't retry on same provider
          }

          if (status === 503 || status === 429 || status >= 500 || status === 422) {
            if (attempt < maxAttempts) {
              const delayMs = backoffDelays[attempt - 1] || 2000
              await new Promise(resolve => setTimeout(resolve, delayMs))
            } else {
              // If it's just a formatting issue and we ran out of attempts, accept it to avoid full failure
              if (status === 422 && lastResponseText) {
                responseText = lastResponseText
                success = true
              }
            }
          } else {
            break
          }
        }
      }

      if (success) {
        console.log('Response status: success')

        // STRICT Product Matching Algorithm
        let referenced_internal_products: string[] = []
        try {
          const createNgrams = (words: string[], maxN: number) => {
              const ngrams = new Set<string>()
              for (let n = 1; n <= maxN; n++) {
                  for (let i = 0; i <= words.length - n; i++) {
                      ngrams.add(words.slice(i, i + n).join(' '))
                  }
              }
              return Array.from(ngrams)
          }

          const extractPhrases = (text: string) => {
              const words = text.toLowerCase().split(/[\s,.;:!?'"()\[\]{}]+/).filter(w => w.length > 0)
              return createNgrams(words, 6)
          }

          const queryPhrases = extractPhrases(query)
          const responsePhrases = extractPhrases(responseText)
          
          const queryMatchedNames = new Set<string>()
          const responseMatchedNames = new Set<string>()
          const matchedIds = new Set<string>()
          const unmatchedWords = new Set<string>()

          const matchPhrases = (phrases: string[], matchedNames: Set<string>) => {
              for (const phrase of phrases) {
                  if (phrase.length < 2) continue;

                  let matched = false;
                  for (const prod of productMap) {
                      // Strategy A & B: Exact alias or SKU match ONLY
                      if (prod.aliases.includes(phrase)) {
                          matchedIds.add(prod.id)
                          matchedNames.add(prod.name)
                          matched = true;
                          break;
                      }
                  }
                  
                  // Log unmatched single words to avoid huge arrays of phrases
                  if (!matched && !phrase.includes(' ')) {
                      if (phrase.length > 3 && !['como', 'para', 'este', 'esta', 'esse', 'essa', 'qual', 'quais', 'sobre'].includes(phrase)) {
                          unmatchedWords.add(phrase)
                      }
                  }
              }
          }

          matchPhrases(queryPhrases, queryMatchedNames)
          matchPhrases(responsePhrases, responseMatchedNames)

          referenced_internal_products = Array.from(matchedIds).slice(0, 10)
          
          console.log(`Products mentioned in query: [${Array.from(queryMatchedNames).join(', ')}]`)
          console.log(`Products mentioned in response: [${Array.from(responseMatchedNames).join(', ')}]`)
          console.log(`Matched UUIDs: [${referenced_internal_products.join(', ')}]`)
          console.log(`Unmatched words: [${Array.from(unmatchedWords).slice(0, 20).join(', ')}]`)
        } catch (err) {
          console.error("Product matching failed:", err)
        }

        // Insert conversation history
        try {
          await supabaseAdmin.from('conversation_history').insert({
            user_id: authUser?.id || null,
            session_id: sessionId,
            query: query.trim(),
            response: responseText
          })
          
          // Cleanup old history (fire and forget)
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          supabaseAdmin.from('conversation_history').delete().lt('created_at', yesterday).then()
        } catch (e) {
          console.error("Failed to insert history:", e)
        }

        return new Response(JSON.stringify({
          status: "success",
          provider_name: provider.provider_name,
          response: responseText,
          query: query.trim(),
          session_id: sessionId,
          referenced_internal_products
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 7. All Providers Failed
    console.log('Response status: error')
    return new Response(JSON.stringify({
      status: "error",
      message: "Nenhum provedor de IA disponível no momento. Tente novamente em alguns instantes.",
      error_code: "ALL_PROVIDERS_FAILED",
      attempted_providers: attemptedProviders
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Erro interno na função call-ai-agent:", error)
    console.log('Response status: error')
    return new Response(JSON.stringify({
      status: "error",
      message: "Erro interno do servidor ao processar a sua requisição. Tente novamente.",
      error_code: "INTERNAL_SERVER_ERROR"
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function callAIProvider(
  providerName: string, 
  modelId: string, 
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
  if (providerName === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })
    if (!res.ok) throw { status: res.status, message: await res.text() }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  if (providerName === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { 
            role: 'user', 
            parts: [{ text: `Instruções de Sistema:\n${systemPrompt}\n\nConsulta do Usuário:\n${userPrompt}` }] 
          }
        ]
      })
    })
    if (!res.ok) throw { status: res.status, message: await res.text() }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  if (providerName === 'deepseek') {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })
    if (!res.ok) throw { status: res.status, message: await res.text() }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  throw { status: 400, message: `Provedor ${providerName} não reconhecido ou não suportado.` }
}
