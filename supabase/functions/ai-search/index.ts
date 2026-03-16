import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    type: 'not_found',
    message:
      'Fizemos uma busca rápida, mas não conseguimos confirmar todos os detalhes técnicos no momento. Nossos especialistas estão prontos para ajudar!',
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
      .select('id, name, sku, description, category')

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OpenAI key')

    const systemPrompt = `Você é o assistente de IA técnico oficial da "My Way Video".
Sua missão é fornecer respostas EXTREMAMENTE PRECISAS sobre especificações técnicas e SEMPRE mapear a intenção do usuário para os produtos do nosso catálogo.

Base de Conhecimento da Empresa:
${companyInfo}

Inventário Disponível (Produtos na loja):
${JSON.stringify(products || [])}

REGRAS DE OURO:
1. FOCO NO CATÁLOGO: Sua principal tarefa é identificar quais produtos do "Inventário Disponível" correspondem ou se relacionam à pergunta do usuário.
2. RETORNO OBRIGATÓRIO DE PRODUTOS: Você DEVE incluir os 'id's dos produtos correspondentes no array 'product_ids'. Mesmo que a pergunta seja muito específica (ex: "Qual a montagem de lente da FX3?") e você não ache a resposta exata, RETORNE O ID DA CÂMERA MENCIONADA. NUNCA deixe 'product_ids' vazio se o produto existir no inventário.
3. BUSCA NA WEB RESTRITA: Utilize a ferramenta 'search_web' apenas se o usuário pedir um detalhe técnico (bocal, peso, resolução) que não está na descrição do produto. 
4. TIPOS DE RESPOSTA (type):
   - 'technical': Achou a resposta técnica exata.
   - 'not_found': Não achou a especificação técnica exata após buscar, MAS você ainda deve retornar os IDs dos produtos relacionados.
   - 'products': O usuário pediu recomendação genérica ou busca de equipamento.
   - 'institutional': Dúvidas sobre a empresa (endereço, telefone, entrega).
5. CLAREZA E OBJETIVIDADE: Sem alucinações. Responda em Português (PT-BR). Se 'not_found', diga que a especificação técnica exata não foi encontrada, mas mencione o equipamento.

FORMATO DE RESPOSTA (JSON STRICT):
{
  "type": "technical" | "not_found" | "products" | "institutional",
  "message": "Texto direto e claro em PT-BR.",
  "product_ids": ["uuid-1", "uuid-2"]
}`

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description:
            'Busca na web por especificações técnicas exatas de equipamentos de audiovisual (ex: "Sony FX3 lens mount", "ARRI Alexa Mini sensor size").',
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

    let maxToolCalls = 2 // Strict limit
    let toolCallCount = 0
    let finalMessage = null

    while (true) {
      const payload: any = {
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
      }

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
                'No exact data found on web. Stop searching and provide the best possible answer with internal data. If technical spec is missing, set type to not_found but DO NOT FORGET to include product_ids from inventory.',
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
