import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, userName } = await req.json()
    console.log(`[LOG 1] Entrada: Usuário="${userName}", Query="${query}"`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // PASSO 1: Receber todos os prompts das tabelas de configuração
    console.log('[LOG 2] Passo 1: Carregando prompts de configuração...')
    const [
      { data: agentSettings },
      { data: aiSettings },
      { data: globalSettings },
      { data: companyInfo },
    ] = await Promise.all([
      supabase.from('ai_agent_settings').select('*').maybeSingle(),
      supabase.from('ai_settings').select('*').maybeSingle(),
      supabase.from('settings').select('key, value'),
      supabase.from('company_info').select('content, type').maybeSingle(),
    ])

    const globalSettingsMap: Record<string, string> = {}
    globalSettings?.forEach((s: any) => {
      if (s.value) globalSettingsMap[s.key] = s.value
    })

    // PASSO 2: IA recebe query RAW + Personalização
    const systemPrompt = `
      ${agentSettings?.system_prompt || ''}
      ${aiSettings?.system_prompt_template || ''}
      ${aiSettings?.logistics_rules_prompt || ''}
      ${companyInfo?.content || ''}
      
      ### REGRAS DE PERSONALIZAÇÃO ###
      O nome do usuário logado é: ${userName || 'Cliente'}. 
      Use este nome naturalmente na saudação inicial.

      ### REGRAS DE RESPOSTA ###
      - Responda APENAS em JSON no formato: {"message": "...", "referenced_internal_products": ["UUID1", "UUID2"]}
      - Mantenha parágrafos curtos (2-3 frases).
      - Use blocos de código para especificações técnicas.
      - NUNCA mencione Tiers ou status internos no texto.
    `

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }, // Query RAW
    ]

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Busca produtos e especificações técnicas no catálogo My Way.',
          parameters: {
            type: 'object',
            properties: {
              search_term: { type: 'string', description: 'Termo de busca' },
            },
            required: ['search_term'],
          },
        },
      },
    ]

    // PASSO 3: IA requisita produtos (Tool Call)
    console.log('[LOG 3] Passo 3: IA processando intenção de busca...')
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiSettings?.model_id || 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: aiSettings?.temperature || 0.7,
      }),
    })

    const aiData = await aiResponse.json()
    const aiMessage = aiData.choices[0].message

    let productsFound: any[] = []

    if (aiMessage.tool_calls) {
      for (const toolCall of aiMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)
        console.log(`[LOG 3.1] IA solicitou busca por: "${args.search_term}"`)

        // PASSO 4: Sistema levanta produtos (RPC)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('execute_ai_search', {
          search_term: args.search_term,
        })

        if (rpcError) {
          console.error('[ERRO RPC]', rpcError)
          continue
        }

        const stock = rpcResult?.stock || []
        console.log(`[LOG 4] Passo 4: Banco retornou ${stock.length} produtos.`)
        productsFound.push(...stock)

        messages.push(aiMessage)
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(stock),
        })
      }

      // Segunda chamada para finalizar a resposta com os dados do banco
      const finalAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiSettings?.model_id || 'gpt-4o-mini',
          messages,
        }),
      })
      const finalData = await finalAiResponse.json()
      aiMessage.content = finalData.choices[0].message.content
    }

    // PASSO 5: IA Finaliza a resposta
    console.log('[LOG 5] Passo 5: IA gerou resposta final.')
    let result = { message: aiMessage.content, referenced_internal_products: [] }

    try {
      const jsonMatch = aiMessage.content.match(/\{[\s\S]*?\}/)
      if (jsonMatch) result = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('[ERRO PARSE JSON]', e)
    }

    // PASSO 6: Ninja Filter (Sincronia de Cards)
    console.log('[LOG 6] Passo 6: Aplicando Ninja Filter...')
    if (Array.isArray(result.referenced_internal_products)) {
      const originalCount = result.referenced_internal_products.length

      result.referenced_internal_products = result.referenced_internal_products.filter(
        (id: string) => {
          const product = productsFound.find((p) => p.id === id)
          if (!product) return false

          // Verifica se o nome do produto está no texto da resposta
          const isMentioned = result.message.toLowerCase().includes(product.name.toLowerCase())
          if (!isMentioned) {
            console.log(`[FILTER] Removendo card intruso: ${product.name}`)
          }
          return isMentioned
        },
      )

      console.log(
        `[LOG 6.1] Cards validados: ${result.referenced_internal_products.length} de ${originalCount}`,
      )
    }

    // Adiciona Nota de Transparência
    const transparencyNote = globalSettingsMap['transparency_note'] || ''
    result.message = result.message + '\n\n' + transparencyNote

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[ERRO GLOBAL]', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
