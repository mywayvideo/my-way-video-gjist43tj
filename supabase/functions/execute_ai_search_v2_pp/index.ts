import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { query, productId } = body

    if (!query || !productId) {
      return new Response(JSON.stringify({ error: 'Query and productId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    // 1. Fetch Market Intelligence Context
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

    // 2. Fetch specific product and its cache (PC)
    const { data: product } = await supabase
      .from('products')
      .select(`
        *,
        product_cache (*)
      `)
      .eq('id', productId)
      .single()

    const pc = product?.product_cache?.[0] || {}
    const productContext = product
      ? `Product: ${product.name}\nPrice: ${product.price}\nSpecs: ${pc.specs ? JSON.stringify(pc.specs) : ''}\nFeatures: ${pc.features ? JSON.stringify(pc.features) : ''}`
      : 'Product not found.'

    // 3. System Prompt Enrichment
    const systemPrompt = `You are an expert AV consultant helping a user on a product page.
Answer their query based on the following context.

MARKET INTELLIGENCE:
${miContext || 'No recent market events available.'}

PRODUCT DETAILS:
${productContext}
`

    // 4. Call AI
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
      product: product,
      market_intelligence: miData || [],
    }

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
