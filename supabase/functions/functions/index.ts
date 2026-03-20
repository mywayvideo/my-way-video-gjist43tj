import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Request received`)

  try {
    const authHeader = req.headers.get('Authorization')
    console.log(`Auth header present: ${authHeader ? 'yes' : 'no'}`)

    let tokenValid = false
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const {
        data: { user },
        error: authError,
      } = await supabaseAuth.auth.getUser()
      if (authError || !user) {
        console.error('JWT verification failed:', authError?.message)
      } else {
        tokenValid = true
      }
    }
    console.log(`Token valid: ${tokenValid ? 'yes' : 'no'}`)

    const body = await req.json().catch(() => ({}))
    const query = body.query

    if (!query) {
      console.log('Final response status: error')
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'A consulta (query) é obrigatória.',
          error_code: 'MISSING_QUERY',
        }),
        { status: 200, headers: corsHeaders },
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: providers, error: provError } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })
      .limit(1)

    if (provError || !providers || providers.length === 0) {
      console.log('Final response status: error')
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Nenhum provedor de IA disponível.',
          error_code: 'NO_PROVIDERS',
        }),
        { status: 200, headers: corsHeaders },
      )
    }

    const provider = providers[0]
    console.log(`Selected AI provider details: ${provider.provider_name} and ${provider.model_id}`)

    const { data: allProducts, error: prodError } = await supabaseAdmin
      .from('products')
      .select(`id, name, sku, description, price_usd`)

    let matchCount = 0
    if (!prodError && allProducts) {
      const qTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t: string) => t.length > 2)
      const matched = allProducts.filter((p: any) =>
        qTerms.some(
          (t: string) =>
            (p.name || '').toLowerCase().includes(t) ||
            (p.sku || '').toLowerCase().includes(t) ||
            (p.description || '').toLowerCase().includes(t),
        ),
      )
      matchCount = matched.length
    }

    console.log(`Fuzzy match results: ${matchCount} products found`)

    console.log('Final response status: success')
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Execução de debug concluída com sucesso.',
        data: {
          provider_name: provider.provider_name,
          model_id: provider.model_id,
          products_found: matchCount,
          query_received: query,
        },
      }),
      { status: 200, headers: corsHeaders },
    )
  } catch (error: any) {
    console.log('Final response status: error')
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Ocorreu um erro interno durante a execução.',
        error_code: 'INTERNAL_SERVER_ERROR',
      }),
      { status: 200, headers: corsHeaders },
    )
  }
})
