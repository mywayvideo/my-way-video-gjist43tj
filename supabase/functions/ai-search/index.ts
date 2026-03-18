import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    message: 'Neste momento não consigo acessar uma resposta precisa sobre esta especificação. Sugiro contatar um de nossos especialistas para obter a solução audiovisual correta.',
    referenced_internal_products: [],
    should_show_whatsapp_button: true,
    whatsapp_reason: "Necessidade de assistência técnica especializada.",
    price_context: "fob_miami",
    used_web_search: false,
    confidence_level: "low"
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

    const { data: products } = await supabase.from('products').select(`id, name, sku, description, category, dimensions, weight, ncm, price_usd, manufacturers(name)`)

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OpenAI key')

    const systemPrompt = `Você é o "Agente de IA da My Way Video", atuando como um Especialista Técnico Sênior e Consultor de Vendas Ético em Audiovisual Profissional.
Sua missão é fornecer soluções audiovisuais complexas, comparar fluxos de trabalho e listar especificações técnicas de alto nível (capacidades de peso, sensores, codecs de câmera, I/O de hardware, etc).
Mantenha absoluto profissionalismo e neutralidade comercial ética. Seja direto e altamente qualificado.

HIERARQUIA DE BUSCA DE INFORMAÇÕES:
1. Banco de Dados Interno (Inventário da My Way Video listado abaixo).
2. Busca Web (priorize domínios oficiais de fabricantes como Sony, ARRI, Blackmagic, RED, datasheets e manuais).
3. Distribuidores confiáveis apenas se a fabricante não for suficiente.
4. Fontes genéricas apenas como último recurso.

FOCO TÉCNICO:
Busque e normalize atributos específicos da categoria ao comparar ou descrever produtos.

Base Institucional:
${companyInfo}

Inventário Disponível (Produtos na loja):
${JSON.stringify(products || [])}

REGRAS DE PREÇO (MUITO IMPORTANTE):
- SEMPRE inicie as informações de valores com o preço FOB Miami (campo price_usd) em dólares (US$).
- SÓ forneça estimativas em Reais (BRL) se explicitamente solicitado. Se mencionar, deixe claro que o valor base é FOB Miami e que o valor no Brasil dependerá de cálculos dinâmicos de câmbio e taxas na plataforma.

REGRAS GERAIS:
- Liste os UUIDs (campo 'id') dos produtos do inventário relacionados à dúvida no array 'referenced_internal_products'.
- Se o usuário perguntar algo fora do escopo audiovisual ou se você não tiver certeza técnica, classifique "confidence_level" como "low" e ative o botão do WhatsApp ("should_show_whatsapp_button": true).
- Formate a resposta da "message" rigorosamente em Markdown (use negrito para especificações, listas para comparações).
- Retorne a resposta ESTRITAMENTE em formato JSON.

FORMATO JSON STRICT:
{
  "message": "Sua resposta técnica, detalhada e formatada em Markdown...",
  "referenced_internal_products": ["uuid-1", "uuid-2"],
  "should_show_whatsapp_button": true/false,
  "whatsapp_reason": "Justificativa breve e profissional para o contato humano ou vazio se false",
  "price_context": "fob_miami",
  "used_web_search": true/false,
  "confidence_level": "high" | "medium" | "low"
}`

    const tools = [{ type: 'function', function: { name: 'search_web', description: 'Busca na web por especificações e datasheets oficiais', parameters: { type: 'object', properties: { search_query: { type: 'string' } }, required: ['search_query'] } } }]
    let messages: any[] = [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }]
    let toolCallCount = 0; let finalMessage = null; let usedWeb = false

    while (true) {
      const payload: any = { model: 'gpt-4o-mini', messages, response_format: { type: 'json_object' } }
      if (toolCallCount < 2) { payload.tools = tools; payload.tool_choice = 'auto' }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
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
              const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla' }, body: `q=${encodeURIComponent(args.search_query)}` })
              let content = ''
              if (ddgRes.ok) {
                 const html = await ddgRes.text()
                 const snippets = [...html.matchAll(/<td class='result-snippet'[^>]*>(.*?)<\/td>/g)].slice(0,3).map(m => m[1].replace(/<[^>]+>/g, '').trim())
                 content = snippets.join('\n')
              }
              messages.push({ role: 'tool', tool_call_id: t.id, content: content || 'No data.' })
            } catch (e) { messages.push({ role: 'tool', tool_call_id: t.id, content: 'Error' }) }
          }
        }
        toolCallCount++
      } else { finalMessage = message; break }
    }

    let result
    try { 
      result = JSON.parse(finalMessage?.content || '{}')
      if (!Array.isArray(result.referenced_internal_products)) result.referenced_internal_products = []
      result.used_web_search = usedWeb
      if (result.confidence_level === 'low') result.should_show_whatsapp_button = true
      result.whatsapp_reason = result.whatsapp_reason || ""
    } 
    catch { result = fallbackResponse }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify(fallbackResponse), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
