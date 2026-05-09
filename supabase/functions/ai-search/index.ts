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

    // PASSO 1: Carregar prompts
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
      
      ### REGRAS DE OURO (NÃO NEGOCIÁVEIS) ###
      1. O nome do usuário é: ${userName || 'Cliente'}. Use-o na saudação.
      2. Se você citar um produto, você DEVE incluir o ID dele no array 'referenced_internal_products'.
      3. Use APENAS os IDs que o sistema de busca retornar.
      4. Responda em JSON: {"message": "...", "referenced_internal_products": ["ID1", "ID2"]}
      5. Parágrafos curtos. Especificações técnicas em blocos de código.
    `

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ]

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Busca produtos no catálogo My Way.',
          parameters: {
            type: 'object',
            properties: { search_term: { type: 'string' } },
            required: ['search_term'],
          },
        },
      },
    ]

    // PASSO 3 & 4: IA requisita e Sistema levanta produtos
    console.log('[LOG 3] IA processando intenção de busca...')
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
        temperature: 0.1, // Temperatura baixa para maior precisão nos IDs
      }),
    })

    const aiData = await aiResponse.json()
    const aiMessage = aiData.choices[0].message
    let allowedProductIds = new Set<string>()

    if (aiMessage.tool_calls) {
      for (const toolCall of aiMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)
        const { data: rpcResult } = await supabase.rpc('execute_ai_search', {
          search_term: args.search_term,
        })

        const stock = rpcResult?.stock || []
        console.log(`[LOG 4] Banco retornou ${stock.length} produtos para "${args.search_term}"`)

        // Mapeia IDs permitidos (apenas o que o banco de fato encontrou)
        stock.forEach((p: any) => allowedProductIds.add(p.id))

        messages.push(aiMessage)
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(stock),
        })
      }

      const finalAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiSettings?.model_id || 'gpt-4o-mini',
          messages,
          response_format: { type: 'json_object' },
        }),
      })
      const finalData = await finalAiResponse.json()
      aiMessage.content = finalData.choices[0].message.content
    }

    // PASSO 5: IA Finaliza a resposta
    console.log('[LOG 5] IA gerou resposta final.')
    let result = JSON.parse(aiMessage.content)

    // PASSO 6: Validação de Segurança (Anti-Intruso)
    // Em vez de filtrar por nome, filtramos apenas para garantir que o ID existe na busca atual
    if (Array.isArray(result.referenced_internal_products)) {
      const originalCount = result.referenced_internal_products.length

      result.referenced_internal_products = result.referenced_internal_products.filter(
        (id: string) => {
          const isValid = allowedProductIds.has(id)
          if (!isValid) console.log(`[LOG 6] Removendo ID intruso não retornado na busca: ${id}`)
          return isValid
        },
      )

      console.log(
        `[LOG 6.1] Cards finais: ${result.referenced_internal_products.length} de ${originalCount}`,
      )
    }

    const transparencyNote = globalSettingsMap['transparency_note'] || ''
    result.message = result.message.replace(/tier|tiers/gi, '').trim() + '\n\n' + transparencyNote

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
