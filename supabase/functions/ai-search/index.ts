import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    type: 'not_found',
    message:
      "I'm having trouble connecting right now, please try again in a moment or contact our support.",
    product_ids: [],
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    const { query } = await req.json()
    if (!query) throw new Error('Query is required')

    const { data: cData } = await supabase.from('company_info').select('*')
    const companyInfo =
      cData
        ?.filter((c: any) => c.type === 'ai_knowledge' || !c.type)
        .map((c: any) => c.content)
        .join('\n') || ''

    const { data: products } = await supabase
      .from('products')
      .select('id, name, description, sku, category, is_special')

    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAiKey) {
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = `
You are an expert technical AI assistant for "My Way Video", an e-commerce for professional audiovisual equipment. 
Focus on EXTREME TECHNICAL ACCURACY. Provide precise specifications.
DO NOT use generic marketing fluff. Be highly concise.

Knowledge Base (Institutional & Delivery Info):
${companyInfo}

Inventory:
${JSON.stringify(products || [])}

Priority:
1. Institutional: ALWAYS use the exact info from the Knowledge Base above to answer questions about delivery, locations, shipping to Brazil, business hours, etc.
2. Inventory Search: Match user query to inventory and return relevant product IDs.
3. Technical Specs: Act as an expert. Provide precise technical numbers. If you do not know the exact specs, you MUST use 'search_web' tool to find real-time data.

Return ONLY a JSON object with this strict format:
{ "type": "institutional"|"products"|"technical"|"not_found", "message": "Concise tech response in PT-BR", "product_ids": ["uuid1"] }`

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description:
            'Search web for real-time technical specs (resolution, framerates, etc) and missing info',
          parameters: {
            type: 'object',
            properties: { search_query: { type: 'string' } },
            required: ['search_query'],
          },
        },
      },
    ]

    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ]

    let res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      throw new Error(`OpenAI API Error: ${res.statusText}`)
    }

    let aiData = await res.json()
    let message = aiData.choices?.[0]?.message

    if (message?.tool_calls) {
      messages.push(message)
      for (const t of message.tool_calls) {
        if (t.function.name === 'search_web') {
          try {
            const args = JSON.parse(t.function.arguments)
            const w = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(args.search_query)}&utf8=&format=json`,
            )
            const wData = await w.json()
            const snippets = wData.query?.search
              ?.map((s: any) => s.snippet)
              .join(' ')
              .replace(/<[^>]*>?/gm, '')
            messages.push({
              role: 'tool',
              tool_call_id: t.id,
              content: snippets || 'No exact data found.',
            })
          } catch (e) {
            messages.push({
              role: 'tool',
              tool_call_id: t.id,
              content: 'Search failed. Rely on internal knowledge.',
            })
          }
        }
      }
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          response_format: { type: 'json_object' },
        }),
      })
      if (!res.ok) throw new Error('Second OpenAI call failed')
      aiData = await res.json()
      message = aiData.choices?.[0]?.message
    }

    let result
    try {
      result = JSON.parse(
        message?.content || '{"type":"not_found","message":"Erro ao processar","product_ids":[]}',
      )
      if (result.type === 'products' && (!result.product_ids || !result.product_ids.length))
        result.type = 'not_found'
    } catch (e) {
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('AI Edge Function Error:', error.message)
    return new Response(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
