import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  try {
    const clientId = Deno.env.get('UPS_CLIENT_ID')
    const clientSecret = Deno.env.get('UPS_CLIENT_SECRET')
    const environment = Deno.env.get('UPS_ENVIRONMENT')

    if (!clientId || !clientSecret || !environment) {
      return new Response(
        JSON.stringify({ error: 'Credenciais UPS nao configuradas.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const oauthEndpoint = environment === 'production'
      ? 'https://onlinetools.ups.com/security/v1/oauth/token'
      : 'https://onlinetools-cie.ups.com/security/v1/oauth/token'

    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)

    const tokenResponse = await fetch(oauthEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: params.toString()
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error(`UPS OAuth Error (${tokenResponse.status}):`, errorText)
      return new Response(
        JSON.stringify({ error: 'Nao foi possivel autenticar com UPS.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Unhandled error in ups-get-token:', error)
    return new Response(
      JSON.stringify({ error: 'Nao foi possivel autenticar com UPS.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
