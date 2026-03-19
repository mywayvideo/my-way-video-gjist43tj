import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { provider_name } = await req.json()
    if (!provider_name) throw new Error('provider_name is required')

    const { data: provider, error: fetchError } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('provider_name', provider_name)
      .single()

    if (fetchError || !provider) throw new Error('Provider not found')

    const apiKey = Deno.env.get(provider.api_key_secret_name)
    if (!apiKey) {
      await updateProviderStatus(
        supabase,
        provider.id,
        'error',
        'API Key missing in environment variables',
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Secret not found in environment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let isValid = false
    let errorMessage = ''

    try {
      if (provider_name === 'openai' || provider_name === 'deepseek') {
        const baseUrl =
          provider_name === 'deepseek'
            ? 'https://api.deepseek.com/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions'
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: provider.model_id,
            messages: [{ role: 'user', content: 'test connection' }],
            max_tokens: 1,
          }),
        })
        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`API Error: ${res.status} ${errText}`)
        }
        isValid = true
      } else if (provider_name === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${provider.model_id}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'test connection' }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
          },
        )
        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`API Error: ${res.status} ${errText}`)
        }
        isValid = true
      } else {
        throw new Error('Unknown AI provider')
      }
    } catch (e: any) {
      isValid = false
      errorMessage = e.message
    }

    const status = isValid ? 'valid' : 'invalid'
    await updateProviderStatus(supabase, provider.id, status, isValid ? null : errorMessage)

    return new Response(
      JSON.stringify({ success: isValid, error: isValid ? null : errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function updateProviderStatus(
  supabase: any,
  id: string,
  status: string,
  error: string | null,
) {
  await supabase
    .from('ai_providers')
    .update({
      validation_status: status,
      validation_error: error,
      last_validated_at: new Date().toISOString(),
    })
    .eq('id', id)
}
