import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    if (!query) {
      throw new Error('Query is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: manufacturersData } = await supabase.from('manufacturers').select('name')
    const manufacturersList = manufacturersData?.map((m: any) => m.name).join(', ') || ''

    const systemPrompt = `You are an intent classifier for a professional audiovisual store. 
Determine if the user's query relates to the product catalog, AV equipment, or our market intelligence data. 
Consider these manufacturers as relevant context: ${manufacturersList}.
Reply strictly with "VALID" if relevant, or "INVALID" if completely unrelated.`

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    let is_valid = true

    if (OPENAI_API_KEY) {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          temperature: 0,
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        const classification = aiData.choices[0]?.message?.content?.trim().toUpperCase()
        if (classification?.includes('INVALID')) {
          is_valid = false
        }
      }
    }

    if (!is_valid) {
      return new Response(
        JSON.stringify({
          success: true,
          response:
            'Desculpe, só posso ajudar com dúvidas sobre equipamentos audiovisuais profissionais, nosso catálogo e inteligência de mercado.',
          data: { stock: [], pc: [], psc: [], mi: [] },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_catalog_with_mi',
      {
        search_query: query,
      },
    )

    if (searchError) {
      throw searchError
    }

    let finalResponse =
      'Baseado em nosso catálogo e inteligência de mercado, encontrei os seguintes resultados.'

    if (OPENAI_API_KEY) {
      const finalPrompt = `You are My Way Video's expert AV consultant AI agent. Using the following JSON data (stock, product cache, search cache, and market intelligence), provide a comprehensive, expert-level response to the user's query.
      
Query: ${query}

Data: ${JSON.stringify(searchResults)}

Respond in Portuguese, offering technical and commercial insights.`

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'system', content: finalPrompt }],
          temperature: 0.7,
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        finalResponse = aiData.choices[0]?.message?.content || finalResponse
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: finalResponse,
        data: searchResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
