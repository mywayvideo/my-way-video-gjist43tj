import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    type: 'not_found',
    message:
      'Fizemos uma busca rápida, mas não conseguimos confirmar todos os detalhes técnicos no momento. Fale com um de nossos especialistas!',
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
Your goal is EXTREME TECHNICAL ACCURACY and FAST RESPONSES.

Knowledge Base:
${companyInfo}

Inventory:
${JSON.stringify(products || [])}

Rules:
1. Internal Data Priority: The internal Inventory and Knowledge Base are your PRIMARY sources of truth. Always check them first.
2. Web Search Limit: Use the 'search_web' tool ONLY if internal data is insufficient.
3. Objectivity & No Hallucination: Be direct and objective. Do NOT hallucinate or guess specifications. Avoid over-interpreting ambiguous queries. If the query is ambiguous or you cannot find reliable data, suggest human contact.
4. Inconclusive Searches: If you cannot find the exact technical details after searching, set "type" to "not_found", politely state that the specific technical information wasn't found in our quick search, and suggest they contact our specialists via WhatsApp.
5. ALWAYS Include Products: This is CRITICAL. Even if the search is inconclusive ("not_found") or you are answering an institutional question, YOU MUST include the IDs of any products from our Inventory that relate to the user's query in the 'product_ids' array. Never return an empty array if relevant products exist in the Inventory.
6. Format: Fluid PT-BR response.

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

    let maxToolCalls = 2 // Strict limit of 2 tool call iterations to avoid timeouts
    let toolCallCount = 0
    let finalMessage = null

    while (true) {
      const payload: any = {
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
      }

      // Only provide tools if we haven't reached the limit
      if (toolCallCount < maxToolCalls) {
        payload.tools = tools
        payload.tool_choice = 'auto'
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`OpenAI API Error: ${res.statusText}`)

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
              console.error('DDG Search error:', e)
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
                console.error('Wiki Search error:', e)
              }
            }

            messages.push({
              role: 'tool',
              tool_call_id: t.id,
              content:
                content ||
                'No exact data found on web. Stop searching and provide the best possible answer with internal data, setting type to not_found if necessary.',
            })
          }
        }
        toolCallCount++
      } else {
        finalMessage = message
        break
      }
    }

    let result
    try {
      result = JSON.parse(finalMessage?.content || JSON.stringify(fallbackResponse))
      if (!Array.isArray(result.product_ids)) {
        result.product_ids = []
      }
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
