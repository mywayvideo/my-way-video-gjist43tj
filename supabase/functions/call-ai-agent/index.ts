import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authentication Check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado. Token ausente.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    // Client for auth check (user context)
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado. Token inválido ou expirado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Payload Validation
    let body;
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Corpo da requisição inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const query = body.query
    const includeCache = body.include_cache !== undefined ? Boolean(body.include_cache) : true

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new Response(JSON.stringify({ error: 'A consulta (query) é obrigatória.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Admin client to bypass RLS for reading cache and providers
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
        return new Response(JSON.stringify({
          status: "cache_hit",
          source: "product_search_cache",
          product_name: cacheHit.product_name,
          product_description: cacheHit.product_description,
          product_price: cacheHit.product_price,
          product_currency: cacheHit.product_currency,
          product_specs: cacheHit.product_specs || {}
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 4. Multi-Provider Fallback Logic (Steps 2 & 3)
    const { data: providers, error: provError } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (provError || !providers || providers.length === 0) {
      return new Response(JSON.stringify({
        status: "error",
        error_message: "Nenhum provedor de IA disponível no momento. Tente novamente em alguns instantes.",
        attempted_providers: []
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const systemPrompt = "You are an expert in professional audiovisual equipment"
    const attemptedProviders: string[] = []

    for (const provider of providers) {
      attemptedProviders.push(provider.provider_name)
      const apiKey = Deno.env.get(provider.api_key_secret_name)
      
      if (!apiKey) {
        console.warn(`API Key ausente para o provedor: ${provider.provider_name}`)
        continue
      }

      let attempt = 0
      const maxAttempts = 3
      const backoffDelays = [2000, 4000, 8000] // 2s, 4s, 8s
      let success = false
      let responseText = ""

      while (attempt < maxAttempts && !success) {
        try {
          responseText = await callAIProvider(provider.provider_name, provider.model_id, apiKey, systemPrompt, query.trim())
          success = true
        } catch (error: any) {
          attempt++
          const status = error?.status || 500
          
          console.error(`Falha no provedor ${provider.provider_name} (Tentativa ${attempt}/${maxAttempts}): HTTP ${status}`)

          // Do not retry on client/auth errors
          if (status === 400 || status === 401 || status === 404) {
            break
          }

          // Retry on 503 or other server/rate-limit errors
          if (status === 503 || status === 429 || status >= 500) {
            if (attempt < maxAttempts) {
              const delayMs = backoffDelays[attempt - 1] || 2000
              await new Promise(resolve => setTimeout(resolve, delayMs))
            }
          } else {
            break
          }
        }
      }

      // If provider was successful, return immediately without caching
      if (success) {
        return new Response(JSON.stringify({
          status: "success",
          provider_name: provider.provider_name,
          response: responseText,
          query: query.trim()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 5. All Providers Failed
    return new Response(JSON.stringify({
      status: "error",
      error_message: "Nenhum provedor de IA disponível no momento. Tente novamente em alguns instantes.",
      attempted_providers: attemptedProviders
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Erro interno na função call-ai-agent:", error)
    return new Response(JSON.stringify({
      status: "error",
      error_message: "Erro interno do servidor ao processar a sua requisição. Tente novamente."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Helper function to call the specific AI Provider APIs
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
