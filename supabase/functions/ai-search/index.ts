import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    type: 'not_found',
    message:
      'Tivemos um problema ao processar sua busca. Por favor, tente novamente ou fale com um especialista.',
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

    // 1. Fetch Internal Company Data
    const { data: cData } = await supabase.from('company_info').select('content, type')
    const companyInfo = cData?.map((c: any) => `[${c.type}]: ${c.content}`).join('\n') || ''

    // 2. Fetch Internal Products Data (Adhering to requested schema columns)
    const { data: products } = await supabase
      .from('products')
      .select(
        'id, name, sku, description, price_brl, stock, ncm, weight, dimensions, category, is_special',
      )

    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAiKey) {
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = `
You are an expert technical AI assistant for "My Way Video", an e-commerce for professional audiovisual equipment. 
Your goal is to provide EXTREME TECHNICAL ACCURACY and synthesize internal business data with external specs.

Knowledge Base (Institutional & Delivery Info):
${companyInfo}

Inventory (Internal DB):
${JSON.stringify(products || [])}

Priority Rules:
1. Internal Data Priority: First, look for answers within the Inventory and Knowledge Base. Use available fields like price_brl, stock, ncm, weight, dimensions, category, and is_special to provide rich context.
2. Web Search Fallback: If the user asks for a product not in the Inventory or asks for technical specs missing from the product description, you MUST use the 'search_web' tool to find real-time data.
3. Cohesive Response Synthesis: Blend internal business rules (like shipping, stock levels, and pricing) with external technical specs into a single, fluid text response in PT-BR.
4. Human Support Handover: If you cannot find a satisfactory answer internally OR externally, set type to 'not_found' to gracefully hand over to human support via WhatsApp.

Return ONLY a JSON object with this strict format:
{ 
  "type": "institutional"|"products"|"technical"|"not_found", 
  "message": "Fluid text response synthesizing internal business rules and external specs in PT-BR.", 
  "product_ids": ["uuid1", "uuid2"] 
}`

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description:
            'Search web for real-time technical specs (resolution, framerates, etc) and missing info when internal DB is insufficient.',
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
            // Wikipedia API fallback search
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
              content: snippets || 'No exact data found on web.',
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
