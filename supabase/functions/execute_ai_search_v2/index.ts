import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { loadCacheSettings } from '../_shared/cacheSettings.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { query, topK = 5 } = body

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    // 1. Check product_search_cache (PSC)
    const { data: cacheHit } = await supabase
      .from('product_search_cache')
      .select('*')
      .eq('search_query', query)
      .single()

    if (cacheHit && new Date(cacheHit.expires_at) > new Date()) {
      return new Response(JSON.stringify(cacheHit.response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch Market Intelligence Context
    const { data: miData, error: miError } = await supabase
      .from('market_intelligence')
      .select('title, ai_summary, event_name')
      .eq('status', 'published')

    let miContext = ''
    if (!miError && miData && miData.length > 0) {
      miContext = miData
        .map((mi) => `Market Event: ${mi.title} - Summary: ${mi.ai_summary}`)
        .join('\n')
    }

    // 3. Search Products and Product Cache (PC)
    const { data: products } = await supabase
      .from('products')
      .select(`
        *,
        product_cache (*)
      `)
      .textSearch('name', query.split(' ').join(' | '))
      .limit(topK)

    const productContext =
      products
        ?.map((p) => {
          const pc = p.product_cache?.[0] || {}
          return `Product: ${p.name}\nPrice: ${p.price}\nSpecs: ${pc.specs ? JSON.stringify(pc.specs) : ''}`
        })
        .join('\n\n') || 'No direct products found.'

    // 4. System Prompt Enrichment
    const systemPrompt = `You are an expert AV consultant.
Answer the user query based on the following context.

MARKET INTELLIGENCE:
${miContext || 'No recent market events available.'}

PRODUCTS:
${productContext}
`

    // 5. Call AI
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    let aiResponseText = ''

    if (openAiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
        }),
      })
      const aiData = await response.json()
      aiResponseText = aiData.choices?.[0]?.message?.content || 'Unable to generate an answer.'
    } else {
      aiResponseText = 'AI provider not configured.'
    }

    const finalResponse = {
      answer: aiResponseText,
      products: products || [],
      market_intelligence: miData || [],
    }

    // 6. Save to product_search_cache
    const cacheSettings = await loadCacheSettings()
    const expiresInDays = cacheSettings?.productSearchCacheExpirationDays || 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    await supabase.from('product_search_cache').upsert({
      search_query: query,
      response: finalResponse,
      expires_at: expiresAt.toISOString(),
    })

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
