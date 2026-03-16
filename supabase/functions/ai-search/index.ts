import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    type: 'not_found',
    message:
      'Não tenho uma informação precisa para lhe dar sobre isso, indicamos falar com um especialista.',
    related_product_ids: [],
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
        `id, name, sku, description, category, dimensions, weight, ncm, price_brl, price_usd, manufacturers(name)`,
      )

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OpenAI key')

    const systemPrompt = `Você é o assistente de IA técnico oficial da "My Way Video".
Sua missão é fornecer respostas EXTREMAMENTE PRECISAS sobre especificações técnicas.
**Prioritize hardware specifications and technical comparisons in your responses.**

Base de Conhecimento:
${companyInfo}

Inventário Disponível (Produtos na loja):
${JSON.stringify(products || [])}

HIERARQUIA DE BUSCA DE INFORMAÇÕES:
1. BANCO DE DADOS INTERNO.
2. Busca na web via 'search_web' tool se faltarem dados.

REGRAS:
- Você DEVE retornar os 'id's dos produtos do nosso inventário que correspondam à dúvida no array 'related_product_ids'.
- Faça comparações técnicas estruturadas se solicitado.

FORMATO JSON STRICT:
{
  "type": "technical" | "not_found" | "products" | "institutional",
  "message": "Sua resposta com prioridade técnica...",
  "related_product_ids": ["uuid-1"]
}`

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description: 'Busca na web por especificações técnicas',
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
    let toolCallCount = 0
    let finalMessage = null

    while (true) {
      const payload: any = {
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
      }
      if (toolCallCount < 2) {
        payload.tools = tools
        payload.tool_choice = 'auto'
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('OpenAI API Error')
      const aiData = await res.json()
      const message = aiData.choices?.[0]?.message

      if (message?.tool_calls) {
        messages.push(message)
        for (const t of message.tool_calls) {
          if (t.function.name === 'search_web') {
            const args = JSON.parse(t.function.arguments)
            try {
              const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'Mozilla',
                },
                body: `q=${encodeURIComponent(args.search_query)}`,
              })
              let content = ''
              if (ddgRes.ok) {
                const html = await ddgRes.text()
                const snippets = [...html.matchAll(/<td class='result-snippet'[^>]*>(.*?)<\/td>/g)]
                  .slice(0, 3)
                  .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
                content = snippets.join('\n')
              }
              messages.push({ role: 'tool', tool_call_id: t.id, content: content || 'No data.' })
            } catch (e) {
              messages.push({ role: 'tool', tool_call_id: t.id, content: 'Error' })
            }
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
      result = JSON.parse(finalMessage?.content || '{}')
      if (!Array.isArray(result.related_product_ids)) result.related_product_ids = []
    } catch {
      result = fallbackResponse
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
