import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackResponse = {
    message: 'Neste momento não consigo acessar uma resposta precisa sobre esta especificação. Sugiro contatar um de nossos engenheiros especialistas para obter a solução técnica correta.',
    referenced_internal_products: [],
    should_show_whatsapp_button: true,
    whatsapp_reason: "Necessidade de assistência técnica especializada e verificação de compatibilidade.",
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

    // Fetch and correctly interpolate Company Info
    const { data: cData } = await supabase.from('company_info').select('content, type')
    const companyInfo = (cData || []).map((c: any) => `[${c.type}]: ${c.content}`).join('\n')

    // Fetch Products and apply Fuzzy Matching locally
    const { data: allProducts } = await supabase.from('products').select(`id, name, sku, description, category, dimensions, weight, ncm, price_usd, manufacturers(name)`)
    
    const searchTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2)
    let matchedProducts = allProducts || []

    if (searchTerms.length > 0 && allProducts) {
      const fuzzyMatches = allProducts.filter((p: any) => {
        const name = (p.name || '').toLowerCase()
        const sku = (p.sku || '').toLowerCase()
        const desc = (p.description || '').toLowerCase()
        return searchTerms.some((term: string) => name.includes(term) || sku.includes(term) || desc.includes(term))
      })
      if (fuzzyMatches.length > 0) {
        matchedProducts = fuzzyMatches
      }
    }
    
    // Limit payload size
    const productsContext = matchedProducts.slice(0, 50)

    // AI Provider Management Check
    let aiProvider = 'openai'
    let aiModel = 'gpt-4o-mini'
    let aiApiKeySecret = 'OPENAI_API_KEY'
    let aiBaseUrl = 'https://api.openai.com/v1/chat/completions'

    try {
      const { data: providers } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority_order', { ascending: true })
        .limit(1)

      if (providers && providers.length > 0) {
        const p = providers[0]
        aiProvider = p.provider_name
        aiModel = p.model_id
        aiApiKeySecret = p.api_key_secret_name
        if (aiProvider === 'deepseek') {
          aiBaseUrl = 'https://api.deepseek.com/v1/chat/completions'
        }
      }
    } catch (e) {
      console.error("Could not fetch ai_providers, falling back to default.", e)
    }

    const apiKey = Deno.env.get(aiApiKeySecret)
    if (!apiKey) throw new Error(`Missing API key for ${aiProvider}`)

    const systemPrompt = `Você é o "Consultor de Engenharia Audiovisual Sênior da My Way Video", especialista técnico em equipamentos de Cinema, Broadcast e ProAV.
Sua missão é fornecer soluções audiovisuais complexas, especificações técnicas detalhadas (capacidades de peso, sensores, codecs, limites de E/S) e atuar com rigoroso profissionalismo.

HIERARQUIA DE BUSCA DE INFORMAÇÕES (SIGA ESTA ORDEM ESTRITAMENTE):
1. Banco de Dados Interno (Inventário da My Way Video listado abaixo).
2. Busca Web (PRIORIZE E RESTRINJA SUAS CONCLUSÕES a domínios oficiais de fabricantes).

OBRIGAÇÃO DE BUSCA NA WEB: Você é PROIBIDO de dizer que não encontrou informações para marcas estabelecidas sem antes realizar buscas exaustivas na web via ferramentas.

Base Institucional:
${companyInfo}

Inventário Disponível (Filtrado por relevância):
${JSON.stringify(productsContext)}

REGRAS DE RETORNO (FORMATO JSON OBRIGATÓRIO E ESTRITO):
{
  "message": "Sua resposta técnica detalhada formatada em Markdown...",
  "referenced_internal_products": ["uuid-1", "uuid-2"],
  "should_show_whatsapp_button": true/false,
  "whatsapp_reason": "Justificativa técnica breve para o contato humano",
  "price_context": "fob_miami",
  "used_web_search": true/false,
  "confidence_level": "high" | "medium" | "low"
}

REGRAS DE ESTADO IMPORTANTES:
- "confidence_level": "high" se a info vier do Banco Interno/fabricante. "medium" se vier de fontes secundárias. "low" se for incerto.
- "should_show_whatsapp_button": OBRIGATORIAMENTE defina como 'true' SE confidence_level for 'low' ou a dúvida envolver integração complexa.`

    const tools = [{ 
      type: 'function', 
      function: { 
        name: 'search_web', 
        description: 'Busca na web via Google Custom Search. Use para specs oficiais.', 
        parameters: { type: 'object', properties: { search_query: { type: 'string' } }, required: ['search_query'] } 
      } 
    }]

    let messages: any[] = [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }]
    let toolCallCount = 0; let finalMessage = null; let usedWeb = false

    while (true) {
      const payload: any = { model: aiModel, messages, response_format: { type: 'json_object' } }
      // OpenAI and Deepseek support function calling standard
      if (toolCallCount < 2 && aiProvider !== 'gemini') { 
        payload.tools = tools; 
        payload.tool_choice = 'auto' 
      }

      const res = await fetch(aiBaseUrl, {
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) throw new Error(`LLM API Error: ${res.statusText}`)
      const aiData = await res.json()
      const message = aiData.choices?.[0]?.message

      if (message?.tool_calls) {
        messages.push(message)
        for (const t of message.tool_calls) {
          if (t.function.name === 'search_web') {
            usedWeb = true
            const args = JSON.parse(t.function.arguments)
            try {
              // GOOGLE CUSTOM SEARCH INTEGRATION
              const googleApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY')
              const googleCx = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
              let content = ''

              if (googleApiKey && googleCx) {
                const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(args.search_query)}`
                const gsRes = await fetch(searchUrl)
                if (gsRes.ok) {
                  const gsData = await gsRes.json()
                  const snippets = (gsData.items || []).slice(0, 5).map((item: any) => 
                    `[Domain: ${item.displayLink} | Source: ${item.link}]\n${item.snippet}`
                  )
                  content = snippets.join('\n\n')
                }
              } else {
                content = 'Google Search API keys not configured.'
              }
              messages.push({ role: 'tool', tool_call_id: t.id, content: content || 'No data returned from web search.' })
            } catch (e) { 
              messages.push({ role: 'tool', tool_call_id: t.id, content: 'Error searching the web.' }) 
            }
          }
        }
        toolCallCount++
      } else { 
        finalMessage = message; 
        break 
      }
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

    // Fire and forget caching logic
    try {
      supabase.from('product_search_cache').insert({
        search_query: query,
        product_name: 'AI Match',
        product_description: result.message,
        source: 'ai_generated'
      }).then()
    } catch(e) { /* Ignore cache insert error */ }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify(fallbackResponse), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
