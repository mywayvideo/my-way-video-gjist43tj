import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, userName }: { query: string; userName: string } = await req.json()

    console.log('Entrada: query=', query, 'userName=', userName)

    // Step 1: Carregar prompts
    console.log('Step 1: Carregando prompts de sistema...')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const [
      { data: agentSettings },
      { data: aiSettings },
      { data: settings },
      { data: companyInfo },
    ] = await Promise.all([
      supabase.from('ai_agent_settings').select('system_prompt').limit(1),
      supabase.from('ai_settings').select('system_prompt').limit(1),
      supabase.from('settings').select('system_prompt').limit(1),
      supabase.from('company_info').select('system_prompt').limit(1),
    ])

    let systemPrompt = [
      agentSettings?.system_prompt,
      aiSettings?.system_prompt,
      settings?.system_prompt,
      companyInfo?.system_prompt,
    ]
      .filter(Boolean)
      .join('\n\n')

    systemPrompt += `\n\nOlá, ${userName}! Você é um assistente especialista em produtos. Saudação direta ao usuário.\n\n`
    systemPrompt += `Responda em parágrafos curtos (2-3 frases). Especificações técnicas em blocos de código:\n\n\
...
\
\n`
    systemPrompt += `Remova menções a 'Tiers' ou status internos do texto final.\n\n`
    systemPrompt += `Para buscar produtos, use a ferramenta 'search_products'.\nApós coletar dados, forneça a resposta FINAL APENAS como JSON válido:\n{"message": "texto da resposta", "referenced_internal_products": [array de IDs de produtos referenciados, apenas relevantes]}\nNão inclua outro texto fora do JSON.`

    console.log(
      'Prompt de sistema carregado (primeiros 200 chars):',
      systemPrompt.substring(0, 200) + '...',
    )

    // OpenAI client
    const getOpenAIResponse = async (messages: any[], tools?: any[]) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          tools,
          tool_choice: 'auto',
        }),
      })
      if (!response.ok) {
        throw new Error(`Erro no provedor de IA: ${response.statusText}`)
      }
      return await response.json()
    }

    // Tool definition
    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description:
            'Busca produtos por palavras-chave, retorna IDs, nomes, SKUs, preços, pesos, dimensões e especificações.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Termo de busca' },
            },
            required: ['query'],
          },
        },
      },
    ]

    // Messages iniciais
    let messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ]

    console.log('Step 2: Iniciando conversa com IA...')

    let finalResponse: string | null = null

    while (true) {
      const completion: any = await getOpenAIResponse(messages, tools)
      console.log('Resposta bruta da IA:', JSON.stringify(completion, null, 2))

      const choice = completion.choices[0]
      const message = choice.message

      if (
        choice.finish_reason === 'tool_calls' &&
        message.tool_calls &&
        message.tool_calls.length > 0
      ) {
        // Assume first tool call
        const toolCall = message.tool_calls[0]
        const args = JSON.parse(toolCall.function.arguments)

        console.log('Step 3: Chamada de ferramenta search_products(query=', args.query, ')')

        // Step 4: Executar RPC
        const { data: products, error } = await supabase.rpc('execute_ai_search', {
          query: args.query,
        })

        if (error) {
          throw new Error(`Erro na busca de produtos: ${error.message}`)
        }

        console.log('Step 4: Produtos do banco:', products)

        // Adicionar à conversa
        messages.push(message)
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(products),
        })
      } else {
        finalResponse = message.content
        console.log('Step 5: Resposta final da IA capturada:', finalResponse)
        break
      }
    }

    // Parse JSON
    let parsed
    try {
      parsed = JSON.parse(finalResponse!)
    } catch (e) {
      throw new Error('A IA não retornou JSON válido. Tente novamente.')
    }

    const { message: rawMessage, referenced_internal_products: ids = [] } = parsed
    console.log('Step 5: JSON parseado:', { rawMessage, ids })

    // Step 6: Ninja Filter
    console.log('Step 6: Aplicando Ninja Filter...')
    let filteredIds = ids
    if (ids.length > 0) {
      const { data: productDetails } = await supabase
        .from('internal_products')
        .select('id, name')
        .in('id', ids)

      console.log('Detalhes dos produtos para filtro:', productDetails)

      const productNames = new Map(productDetails?.map((p: any) => [p.id, p.name]) ?? [])

      filteredIds = ids.filter((id: any) => {
        const name = productNames.get(id)
        if (!name) return false
        return rawMessage.toLowerCase().includes(name.toLowerCase())
      })

      console.log('IDs filtrados:', filteredIds)
    }

    // Limpeza: remover Tiers/status
    const cleanMessage = rawMessage
      .replace(/tier|tier\d+|tiers?|status interno|status de tier/gi, '')
      .trim()

    const finalOutput = {
      message: cleanMessage,
      referenced_internal_products: filteredIds,
    }

    console.log('Resposta final após filtragem e limpeza:', finalOutput)

    return new Response(JSON.stringify(finalOutput), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Erro completo:', error)
    const errorMsg = error.message || 'Erro interno no servidor. Tente novamente.'
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
