import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { search_query } = body

    if (!search_query || typeof search_query !== 'string') {
      return new Response(JSON.stringify({ error: 'Search query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedQuery = search_query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s\-]/g, '')

    const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    let matchedKeywords: any[] = []

    if (tokens.length > 0) {
      const { data, error } = await supabase
        .from('avpro_keywords')
        .select('*')
        .in('keyword', tokens)

      if (error) throw error
      matchedKeywords = data || []
    }

    const blockingTerm = matchedKeywords.find((k) => k.is_blocking)

    if (blockingTerm) {
      return new Response(
        JSON.stringify({
          blocked: true,
          message: `Identificamos o termo "${blockingTerm.keyword}". Atualmente, a My Way Video não atua com este tipo de serviço/produto.`,
          results: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let queryBoost = 1.0
    const matchedKeywordStrings: string[] = []

    for (const match of matchedKeywords) {
      if (match.weight !== null && match.weight !== undefined) {
        queryBoost += Number(match.weight)
      }
      matchedKeywordStrings.push(match.keyword)
    }

    const { data: results, error: searchError } = await supabase.rpc('search_products_v2', {
      search_term: search_query,
      boost_multiplier: queryBoost,
    })

    if (searchError) throw searchError

    return new Response(
      JSON.stringify({
        blocked: false,
        applied_boost: queryBoost,
        matched_keywords: matchedKeywordStrings,
        results: results || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    console.error('Error in execute_ai_search_v2:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
