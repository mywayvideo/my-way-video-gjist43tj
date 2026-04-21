import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  try {
    const { query, products = [], intelligence = [], agentId, isNABQuery, assembledPrompt, temperature = 0.1 } = await req.json()
    
    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: aiSettings } = await supabase.from('ai_settings').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle()
    const systemPromptTemplate = aiSettings?.system_prompt_template || "Você é o Especialista My Way Business, autoridade em audiovisual profissional. Sua missão é converter consultas em vendas. REGRAS: 1. SOBERANIA DE DADOS: Se houver produtos no stock, eles ESTÃO DISPONÍVEIS. 2. FORMATO: Use Markdown e negrito para nomes/preços. 3. MIAMI: Mencione envio de Miami e garantia Brasil/LATAM."
    const logisticsRulesPrompt = aiSettings?.logistics_rules_prompt || "Se price_usd > 0: Envio de Miami com garantia integral no Brasil e América Latina. Origem: Doral, FL."

    let agent = null
    if (agentId) {
      const { data } = await supabase.from('ai_providers').select('*').eq('id', agentId).single()
      agent = data
    } else {
      const { data } = await supabase.from('ai_providers').select('*').eq('is_active', true).order('priority_order', { ascending: true }).limit(1).single()
      agent = data
    }

    if (!agent) {
      return new Response(JSON.stringify({ message: "Nenhum agente de IA configurado." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const hasIntelData = intelligence && intelligence.length > 0;
    
    const dynamicConstraints = `
REGRAS OBRIGATÓRIAS:
- Responda APENAS em Português (PT-BR).
- Especificações técnicas DEVEM SEMPRE estar em blocos de código (\`\`\`).
- Mantenha os parágrafos curtos (máximo de 2 frases por parágrafo).
- SEMPRE inclua o aviso de garantia oficial Brasil/LATAM ao final da resposta.
- NUNCA mencione IDs de produtos.
- É ESTRITAMENTE PROIBIDO dizer "Infelizmente, não localizei o modelo...".
- Se os DADOS REAIS DO BANCO tiverem produtos, é PROIBIDO dizer que não encontrou no catálogo.
${hasIntelData || isNABQuery ? '- É EXPRESSAMENTE PROIBIDO dizer que "não há informações" se houver correspondência em \'title\' ou \'OFFICIAL_SUMMARY\'. Utilize os dados reais da inteligência fornecida.' : ''}
${isNABQuery ? '- PRIORIZE os dados da NAB 2026 na sua resposta e inicie com: "Confirmamos diretamente da NAB 2026: "' : ''}
`

    const finalSystemPrompt = assembledPrompt ? `${assembledPrompt}\n\n${dynamicConstraints}` : `${systemPromptTemplate}\n\n${logisticsRulesPrompt}\n\n${dynamicConstraints}`

    const dataContext = `
DADOS REAIS DO BANCO:
${JSON.stringify(products)}

INTELIGÊNCIA DE MERCADO:
${JSON.stringify(intelligence)}
    `

    const userPrompt = `${query}\n\nContexto Extra:\n${dataContext}`

    const apiKeyName = agent.api_key_secret_name
    let apiKey = ''
    if (apiKeyName) apiKey = Deno.env.get(apiKeyName) || ''

    if (!apiKey) {
      return new Response(JSON.stringify({ message: "A chave de API não está configurada para o agente selecionado." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const providerType = agent.provider_type || agent.provider_name
    let message = ""

    if (providerType === 'openai' || providerType === 'deepseek') {
      const url = providerType === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: agent.model_id,
          temperature: temperature,
          messages: [
            { role: 'system', content: finalSystemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      message = data.choices?.[0]?.message?.content || ''
    } else if (providerType === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${agent.model_id}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `System:\n${finalSystemPrompt}\n\nUser:\n${userPrompt}` }] }],
          generationConfig: { temperature: temperature }
        })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      message = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else if (providerType === 'custom' || providerType === 'anthropic') {
       const isAnthropic = providerType === 'anthropic' || (agent.custom_endpoint || '').includes('anthropic.com')
       const headers: any = { 'Content-Type': 'application/json' }
       let bodyObj: any = {}

       if (isAnthropic) {
         headers['x-api-key'] = apiKey
         headers['anthropic-version'] = '2023-06-01'
         bodyObj = {
           model: agent.model_id,
           max_tokens: 4096,
           temperature: temperature,
           system: finalSystemPrompt,
           messages: [{ role: 'user', content: userPrompt }]
         }
       } else {
         headers['Authorization'] = `Bearer ${apiKey}`
         bodyObj = {
           model: agent.model_id,
           temperature: temperature,
           messages: [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: userPrompt }]
         }
       }

       const res = await fetch(agent.custom_endpoint || 'https://api.anthropic.com/v1/messages', {
         method: 'POST',
         headers,
         body: JSON.stringify(bodyObj)
       })
       if (!res.ok) throw new Error(await res.text())
       const data = await res.json()
       if (isAnthropic) {
         message = data.content?.[0]?.text || ''
       } else {
         message = data.choices?.[0]?.message?.content || ''
       }
    } else {
      throw new Error(`Provedor não suportado: ${providerType}`)
    }

    if (!message) {
       message = "Não foi possível gerar uma resposta com o agente selecionado."
    }

    return new Response(JSON.stringify({ message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('process-query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
