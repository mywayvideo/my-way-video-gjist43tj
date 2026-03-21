import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const role = user.app_metadata?.role || user.user_metadata?.role || user.role
    if (role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const { provider_name } = body

    if (!provider_name || !['openai', 'gemini', 'deepseek'].includes(provider_name)) {
      return new Response(
        JSON.stringify({
          status: 'invalid',
          provider_name: provider_name || 'unknown',
          error_message: 'Provedor de IA inválido ou não fornecido',
          validation_error: 'Missing or invalid provider_name',
          success: false,
          error: 'Provedor de IA inválido ou não fornecido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let secretName = ''
    if (provider_name === 'openai') secretName = 'OPENAI_API_KEY'
    if (provider_name === 'gemini') secretName = 'GEMINI_API_KEY'
    if (provider_name === 'deepseek') secretName = 'DEEPSEEK_API_KEY'

    const { data: provider } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('provider_name', provider_name)
      .single()

    if (provider && provider.api_key_secret_name) {
      secretName = provider.api_key_secret_name
    }

    const apiKey = Deno.env.get(secretName)
    if (!apiKey) {
      if (provider) {
        await updateProviderStatus(supabase, provider.id, 'error', `Chave de API ${secretName} não encontrada`)
      }
      return new Response(
        JSON.stringify({
          status: 'invalid',
          provider_name,
          error_message: `Chave de API não configurada para ${provider_name}`,
          validation_error: `Secret ${secretName} not found`,
          success: false,
          error: `Chave de API não configurada para ${provider_name}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let isValid = false
    let errorMessage = ''
    let validationError = ''

    const fetchWithRetry = async (url: string, options: RequestInit, attempts = 3) => {
      for (let i = 0; i < attempts; i++) {
        const res = await fetch(url, options)
        if (res.status >= 200 && res.status < 300) {
          return { ok: true, res }
        }
        if (res.status === 503) {
          if (i < attempts - 1) {
            const delay = Math.pow(2, i + 1) * 1000 // 2s, 4s, 8s
            await new Promise(r => setTimeout(r, delay))
            continue
          }
        }
        const text = await res.text().catch(() => '')
        return { ok: false, status: res.status, errorText: text }
      }
      return { ok: false, status: 503, errorText: 'Service Unavailable after retries' }
    }

    try {
      let result;
      if (provider_name === 'openai') {
        result = await fetchWithRetry('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
      } else if (provider_name === 'deepseek') {
        result = await fetchWithRetry('https://api.deepseek.com/models', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
        })
      } else if (provider_name === 'gemini') {
        const model = provider?.model_id || 'gemini-1.5-flash'
        result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "test connection" }] }],
            generationConfig: { maxOutputTokens: 1 }
          })
        })
      }

      if (result?.ok) {
        isValid = true
      } else {
        isValid = false
        errorMessage = 'Erro na comunicação com o provedor'
        validationError = `HTTP ${result?.status}: ${result?.errorText}`
      }
    } catch (e: any) {
      isValid = false
      errorMessage = 'Erro interno ao validar a conexão'
      validationError = e.message
    }

    const status = isValid ? 'valid' : 'invalid'
    if (provider) {
      await updateProviderStatus(supabase, provider.id, isValid ? 'valid' : 'error', isValid ? null : validationError)
    }

    if (isValid) {
      return new Response(
        JSON.stringify({
          status: 'valid',
          provider_name,
          validated_at: new Date().toISOString(),
          message: 'API válida e operacional',
          success: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          status: 'invalid',
          provider_name,
          error_message: errorMessage,
          validation_error: validationError,
          success: false,
          error: errorMessage
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: 'invalid',
        provider_name: 'unknown',
        error_message: 'Erro interno do servidor',
        validation_error: error.message,
        success: false,
        error: 'Erro interno do servidor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function updateProviderStatus(supabase: any, id: string, status: string, error: string | null) {
  await supabase.from('ai_providers').update({
    validation_status: status,
    validation_error: error,
    last_validated_at: new Date().toISOString()
  }).eq('id', id)
}
