import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    message:
      'Neste momento não consigo acessar uma resposta precisa sobre esta especificação. Sugiro contatar um de nossos engenheiros especialistas para obter a solução técnica correta.',
    referenced_internal_products: [],
    should_show_whatsapp_button: true,
    whatsapp_reason:
      'Necessidade de assistência técnica especializada e verificação de compatibilidade.',
    price_context: 'fob_miami',
    used_web_search: false,
    confidence_level: 'low',
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
        `id, name, sku, description, category, dimensions, weight, ncm, price_usd, manufacturers(name)`,
      )

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OpenAI key')

    const systemPrompt = `Você é o "Consultor de Engenharia Audiovisual Sênior da My Way Video", especialista técnico em equipamentos de Cinema, Broadcast e ProAV.
Sua missão é fornecer soluções audiovisuais complexas, especificações técnicas detalhadas (capacidades de peso, sensores, codecs, limites de E/S) e atuar com rigoroso profissionalismo.

HIERARQUIA DE BUSCA DE INFORMAÇÕES (SIGA ESTA ORDEM ESTRITAMENTE):
1. Banco de Dados Interno (Inventário da My Way Video listado abaixo).
2. Busca Web (PRIORIZE E RESTRINJA SUAS CONCLUSÕES a domínios oficiais de fabricantes, ex: pro.sony, arri.com, blackmagicdesign.com, sachtler.com, canon.com, panasonic.net, red.com, teradek.com).
3. Manuais e Datasheets oficiais em PDF.
4. Distribuidores confiáveis (B&H, CVP) APENAS se os sites oficiais não retornarem dados úteis.

OBRIGAÇÃO DE BUSCA NA WEB: Se o produto ou a especificação solicitada não constar CLARAMENTE no Banco Interno, você DEVE acionar a ferramenta 'search_web' antes de responder. É EXPRESSAMENTE PROIBIDO dizer que não tem a informação sem antes fazer uma busca técnica aprofundada na web. Adicione termos como "official specifications", "datasheet", ou "specs" à sua query no search_web.

Base Institucional:
${companyInfo}

Inventário Disponível (Produtos na loja):
${JSON.stringify(products || [])}

REGRAS DE RETORNO (FORMATO JSON OBRIGATÓRIO E ESTRITO):
{
  "message": "Sua resposta técnica detalhada, formatada rigorosamente em Markdown (use tabelas, listas e negrito para destacar specs)...",
  "referenced_internal_products": ["uuid-1", "uuid-2"], // Liste UUIDs do banco interno se você recomendar produtos que constem no Inventário.
  "should_show_whatsapp_button": true/false,
  "whatsapp_reason": "Justificativa técnica breve para o contato humano",
  "price_context": "fob_miami",
  "used_web_search": true/false,
  "confidence_level": "high" | "medium" | "low"
}

REGRAS DE ESTADO IMPORTANTES:
- "confidence_level": Defina "high" APENAS se a informação vier do Banco Interno ou de um domínio oficial de fabricante. Defina "low" se a informação vier de fontes genéricas ou se não encontrar uma resposta conclusiva.
- "should_show_whatsapp_button": OBRIGATORIAMENTE defina como 'true' SE:
    1. confidence_level for 'low'.
    2. O equipamento for de alto valor ou extrema complexidade (Cinema/Broadcast) e fontes externas foram necessárias.
    3. A dúvida do usuário envolver integração complexa ou fluxo de trabalho onde erro pode causar prejuízo.

REGRAS DE PREÇO:
- SEMPRE inicie informações financeiras com o preço FOB Miami (US$).
- Se fornecer estimativas em BRL, avise explicitamente que o valor final dependerá de cálculo dinâmico cambial e tributário.`

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description:
            'Busca na web por especificações e datasheets oficiais. OBRIGATÓRIO usar quando a resposta não estiver no banco interno. Enriqueça a query com termos como "official specs", "datasheet", ou "manual".',
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
    let usedWeb = false

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
            usedWeb = true
            const args = JSON.parse(t.function.arguments)
            try {
              const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'Mozilla/5.0',
                },
                body: `q=${encodeURIComponent(args.search_query)}`,
              })
              let content = ''
              if (ddgRes.ok) {
                const html = await ddgRes.text()
                const snippetRegex = /<td class='result-snippet'[^>]*>(.*?)<\/td>/g
                const urlRegex = /<a rel="nofollow" href="([^"]+)" class="result-url"/g

                const snippetsMatches = [...html.matchAll(snippetRegex)]
                const urlsMatches = [...html.matchAll(urlRegex)]

                const snippets = snippetsMatches.slice(0, 5).map((m, i) => {
                  const url = urlsMatches[i] ? urlsMatches[i][1] : 'unknown_domain'
                  return `[Source: ${url}]\n${m[1].replace(/<[^>]+>/g, '').trim()}`
                })
                content = snippets.join('\n\n')
              }
              messages.push({
                role: 'tool',
                tool_call_id: t.id,
                content: content || 'No data returned from web search.',
              })
            } catch (e) {
              messages.push({
                role: 'tool',
                tool_call_id: t.id,
                content: 'Error searching the web.',
              })
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
      if (!Array.isArray(result.referenced_internal_products))
        result.referenced_internal_products = []
      result.used_web_search = usedWeb
      if (result.confidence_level === 'low') result.should_show_whatsapp_button = true
      result.whatsapp_reason = result.whatsapp_reason || ''
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
