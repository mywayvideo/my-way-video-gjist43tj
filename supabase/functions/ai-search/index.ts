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
    // =========================
    //  INPUT VALIDATION
    // =========================
    let body = null
    try {
      body = await req.json()
    } catch (e) {
      console.error('[ERRO] Body JSON inválido:', e)
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const query = typeof body?.query === 'string' ? body.query : ''
    const userName = typeof body?.userName === 'string' ? body.userName : 'Cliente'

    console.log(`[LOG 1] Entrada: Usuário="${userName}", Query="${query}"`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // =========================
    //  LOAD CONFIG
    // =========================
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
    if (Array.isArray(globalSettings)) {
      for (const s of globalSettings) {
        if (s?.key && s?.value) globalSettingsMap[s.key] = s.value
      }
    }

    // =========================
    //  SYSTEM PROMPT
    // =========================
    const systemPrompt = `
      ${agentSettings?.system_prompt || ''}
      ${aiSettings?.system_prompt_template || ''}
      ${aiSettings?.logistics_rules_prompt || ''}
      ${companyInfo?.content || ''}
      
      ### REGRAS DE OURO (NÃO NEGOCIÁVEIS) ###
      1. O nome do usuário é: ${userName}. Use-o na saudação.
      2. Se você citar um produto, você DEVE incluir o ID dele no array 'referenced_internal_products'.
      3. Use APENAS os IDs que o sistema de busca retornar.
      4. Responda em JSON: {"message": "...", "referenced_internal_products": ["ID1", "ID2"]}
      5. Parágrafos curtos. Especificações técnicas em blocos de código.
    `

    const messages: any[] = [
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

    // =========================
    //  FIRST CALL TO OPENAI
    // =========================
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
        temperature: 0.1,
      }),
    })

    let aiData: any = null
    try {
      aiData = await aiResponse.json()
    } catch (e) {
      console.error('[ERRO] JSON inválido da OpenAI:', e)
      return new Response(JSON.stringify({ error: 'Erro ao decodificar resposta da IA' }), {
        headers: corsHeaders,
        status: 500,
      })
    }

    // VALIDATION: choices must exist
    if (!aiData?.choices?.length || !aiData.choices[0]?.message) {
      console.error('[ERRO] OpenAI retornou payload inválido (fase 1):', aiData)
      return new Response(JSON.stringify({ error: 'Falha ao obter resposta da IA.' }), {
        headers: corsHeaders,
        status: 500,
      })
    }

    const aiMessage = aiData.choices[0].message
    const allowedProductIds = new Set<string>()

    // =========================
    //  TOOL CALLS
    // =========================
    if (Array.isArray(aiMessage?.tool_calls)) {
      // SEMPRE empurrar a mensagem assistant ANTES do loop
      messages.push({
        role: 'assistant',
        content: aiMessage.content ?? '',
        tool_calls: aiMessage.tool_calls ?? null,
      })

      for (const toolCall of aiMessage.tool_calls) {
        let stock: any[] = []
        let args = {}
        try {
          const rawArgs =
            toolCall?.function?.arguments && typeof toolCall.function.arguments === 'string'
              ? toolCall.function.arguments
              : '{}'

          args = JSON.parse(rawArgs)
        } catch (e) {
          console.error('[ERRO] Argumentos inválidos da tool_call:', toolCall, e)
          args = {} // força estado seguro
        }

        const term = typeof args?.search_term === 'string' ? args.search_term : ''
        try {
          const { data: rpcResult } = await supabase.rpc('execute_ai_search', { search_term: term })
          stock = Array.isArray(rpcResult?.stock) ? rpcResult.stock : []
          stock.forEach((p: any) => allowedProductIds.add(p.id))
        } catch (e) {
          console.error('[ERRO] Falha ao executar RPC execute_ai_search:', e)
        }

        // RESPOSTA OBRIGATÓRIA — SEMPRE
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(stock || []),
        })
      }
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

    let finalData = null
    try {
      finalData = await finalAiResponse.json()
    } catch {
      console.error('[ERRO] Resposta final da IA é inválida JSON')
      return new Response(JSON.stringify({ error: 'Erro ao decodificar resposta final' }), {
        headers: corsHeaders,
        status: 500,
      })
    }

    if (!finalData?.choices?.length || !finalData.choices[0]?.message?.content) {
      console.error('[ERRO] OpenAI retornou payload final inválido (fase 2):', finalData)
      return new Response(JSON.stringify({ error: 'Falha ao obter resposta final da IA.' }), {
        headers: corsHeaders,
        status: 500,
      })
    }

    aiMessage.content = finalData.choices[0].message.content
    aiMessage.role = 'assistant'
    aiMessage.tool_calls = null
    delete aiMessage.refusal
    delete aiMessage.reasoning

    // =========================
    //  JSON PARSE SAFETY
    // =========================
    let result: any = {}
    try {
      result = JSON.parse(aiMessage.content)
    } catch (e) {
      console.error('[ERRO] JSON inválido retornado pela IA:', aiMessage.content)
      return new Response(JSON.stringify({ error: 'IA retornou JSON inválido' }), {
        headers: corsHeaders,
        status: 500,
      })
    }

    // =========================
    //  SECURITY: PRODUCT IDS
    // =========================
    if (Array.isArray(result.referenced_internal_products)) {
      const originalCount = result.referenced_internal_products.length

      result.referenced_internal_products = result.referenced_internal_products.filter(
        (id: string) => {
          const ok = allowedProductIds.has(id)
          if (!ok) console.log(`[LOG 6] Removendo ID intruso: ${id}`)
          return ok
        },
      )

      console.log(
        `[LOG 6.1] Cards finais: ${result.referenced_internal_products.length} de ${originalCount}`,
      )
    }

    // =========================
    //  MESSAGE CLEANUP & APPEND
    // =========================
    if (typeof result.message === 'string') {
      result.message =
        result.message.replace(/tier|tiers/gi, '').trim() +
        '\n\n' +
        (globalSettingsMap['transparency_note'] || '')
    } else {
      console.error('[ERRO] result.message NÃO é string:', result.message)
      result.message = globalSettingsMap['transparency_note'] || ''
    }

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
