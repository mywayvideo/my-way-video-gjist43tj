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

    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase credentials')

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    const { query } = await req.json()
    if (!query) throw new Error('Query is required')

    const { data: cData } = await supabase.from('company_info').select('content, type')
    const companyInfo = cData?.map((c: any) => `[${c.type}]: ${c.content}`).join('\n') || ''

    const { data: products } = await supabase
      .from('products')
      .select(
        'id, name, sku, description, price_brl, stock, ncm, weight, dimensions, category, is_special',
      )

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OpenAI key')

    const systemPrompt = `You are a technical AI assistant for "My Way Video".
Your goal is EXTREME TECHNICAL ACCURACY.

Knowledge Base:
${companyInfo}

Inventory:
${JSON.stringify(products || [])}

Rules:
1. Internal Data Priority: Prioritize internal DB as "source of truth".
2. Manufacturer-First Priority: For web searches, prioritize official sites (e.g., site:sony.com) and professional repos using 'search_web' tool.
3. Recursive Search: If initial search fails to find core specs (e.g., "lens mount", "sensor type", "native ISO"), MUST perform a second search with keywords (e.g., "technical specs").
4. Cross-referencing: Cross-reference multiple reliable sources. Avoid saying "I don't know" until exhausting prioritized sources.
5. Detailed Responses: Accurately state professional parameters (e.g., "Sony E-mount"). Blend internal rules with external specs in a fluid PT-BR response.
6. Handover: If unavailable after persistent searches, set type to 'not_found'.

Return JSON:
{ "type": "institutional"|"products"|"technical"|"not_found", "message": "Text response in PT-BR", "product_ids": ["uuid1", "uuid2"] }`

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description:
            'Search web for specs. Always use site:domain.com for manufacturer sites first (e.g., site:sony.com Sony FX3 lens mount).',
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

    let maxIterations = 4
    let iteration = 0
    let finalMessage = null

    while (iteration < maxIterations) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

      if (!res.ok) throw new Error(`OpenAI API Error`)

      const aiData = await res.json()
      const message = aiData.choices?.[0]?.message

      if (message?.tool_calls) {
        messages.push(message)
        for (const t of message.tool_calls) {
          if (t.function.name === 'search_web') {
            let content = ''
            const args = JSON.parse(t.function.arguments)
            try {
              const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                body: `q=${encodeURIComponent(args.search_query)}`,
              })

              if (ddgRes.ok) {
                const html = await ddgRes.text()
                const snippetRegex = /<td class='result-snippet'[^>]*>(.*?)<\/td>/g
                let match
                const snippets = []
                while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
                  snippets.push(match[1].replace(/<[^>]+>/g, '').trim())
                }
                if (snippets.length > 0) content = snippets.join('\n')
              }
            } catch (e) {
              console.error(e)
            }

            if (!content) {
              try {
                const w = await fetch(
                  `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(args.search_query)}&utf8=&format=json`,
                )
                const wData = await w.json()
                const snippets = wData.query?.search
                  ?.map((s: any) => s.snippet)
                  .join(' ')
                  .replace(/<[^>]*>?/gm, '')
                if (snippets) content = snippets
              } catch (e) {
                console.error(e)
              }
            }

            messages.push({
              role: 'tool',
              tool_call_id: t.id,
              content:
                content ||
                'No exact data found on web. Try refining query with site:manufacturer.com or technical terms.',
            })
          }
        }
      } else {
        finalMessage = message
        break
      }
      iteration++
    }

    let result
    try {
      result = JSON.parse(
        finalMessage?.content || '{"type":"not_found","message":"Erro","product_ids":[]}',
      )
      if (result.type === 'products' && (!result.product_ids || !result.product_ids.length))
        result.type = 'not_found'
    } catch (e) {
      result = fallbackResponse
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
