import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const reqBody = await req.json()
    const { messages, agentId } = reqBody

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required')
    }

    const lastMessage = messages[messages.length - 1]?.content || ''
    const keywords = lastMessage.split(/\s+/).filter((k: string) => k.length > 2)

    let productsData: any[] = []
    let productCacheData: any[] = []
    let productSearchCacheData: any[] = []
    let miData: any[] = []

    if (keywords.length > 0) {
      // 1. Products (Priority 1)
      const orQueryProducts = keywords
        .map((kw) => `title.ilike.%${kw}%,description.ilike.%${kw}%`)
        .join(',')
      const { data: products } = await supabase
        .from('products')
        .select('id, title, price, description')
        .or(orQueryProducts)
        .limit(10)
      if (products) productsData = products

      // 2. Product Cache (Priority 2)
      const orQueryPC = keywords.map((kw) => `name.ilike.%${kw}%`).join(',')
      const { data: pc } = await supabase
        .from('product_cache')
        .select('id, name, price, specs')
        .or(orQueryPC)
        .limit(5)
      if (pc) productCacheData = pc

      // 3. Product Search Cache (Priority 3)
      const orQueryPSC = keywords.map((kw) => `query.ilike.%${kw}%`).join(',')
      const { data: psc } = await supabase
        .from('product_search_cache')
        .select('id, query, results')
        .or(orQueryPSC)
        .limit(3)
      if (psc) productSearchCacheData = psc

      // 4. Market Intelligence
      const orQueryMI = keywords.map((kw) => `title.ilike.%${kw}%,content.ilike.%${kw}%`).join(',')
      const { data: mi } = await supabase
        .from('market_intelligence')
        .select('id, title, content')
        .or(orQueryMI)
        .limit(5)

      if (mi) {
        // Strict filter in memory to ensure it contains at least one keyword (Validation)
        miData = mi.filter((item) => {
          const text = `${item.title || ''} ${item.content || ''}`.toLowerCase()
          return keywords.some((kw) => text.includes(kw.toLowerCase()))
        })
      }
    }

    // Determine System Prompt
    let systemPrompt =
      'You are a specialized AI assistant. You help users find professional audiovisual equipment.'
    if (agentId) {
      const { data: agent } = await supabase
        .from('ai_intelligences')
        .select('system_prompt')
        .eq('id', agentId)
        .single()
      if (agent?.system_prompt) systemPrompt = agent.system_prompt
    } else {
      const { data: defaultAgent } = await supabase
        .from('ai_intelligences')
        .select('system_prompt')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (defaultAgent?.system_prompt) systemPrompt = defaultAgent.system_prompt
    }

    // Build context block
    let contextBlock = `\n\n--- DATABASE SEARCH CONTEXT ---\n`
    contextBlock += `PRIORITY 1 - MAIN CATALOG (products):\n${JSON.stringify(productsData)}\n\n`
    contextBlock += `PRIORITY 2 - PRODUCT CACHE (specifications):\n${JSON.stringify(productCacheData)}\n\n`
    contextBlock += `PRIORITY 3 - PREVIOUS SEARCHES:\n${JSON.stringify(productSearchCacheData)}\n\n`
    contextBlock += `MARKET INTELLIGENCE (context & tips):\n${JSON.stringify(miData)}\n\n`
    contextBlock += `INSTRUCTIONS:\n`
    contextBlock += `1. You MUST prioritize exact matches from the MAIN CATALOG over other sources.\n`
    contextBlock += `2. You MUST ONLY recommend products present in this context. DO NOT hallucinate or invent products.\n`
    contextBlock += `3. Any product you mention MUST have its ID extracted so it can be rendered.\n`

    const modifiedMessages = [...messages]
    modifiedMessages[modifiedMessages.length - 1] = {
      role: 'user',
      content: `${lastMessage}${contextBlock}`,
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'system', content: systemPrompt }, ...modifiedMessages],
      tools: [
        {
          type: 'function',
          function: {
            name: 'provide_answer',
            description: 'Provide the answer to the user and list any product UUIDs referenced.',
            parameters: {
              type: 'object',
              properties: {
                answer: {
                  type: 'string',
                  description: 'The markdown-formatted response to the user.',
                },
                referenced_internal_products: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Array of UUIDs of the products from the MAIN CATALOG or PRODUCT CACHE that were explicitly mentioned or recommended in the answer.',
                },
              },
              required: ['answer', 'referenced_internal_products'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'provide_answer' } },
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    let result = {
      answer: "I couldn't generate an answer based on the provided context.",
      referenced_internal_products: [] as string[],
    }

    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments)

        // Hallucination prevention: validate that all returned IDs actually exist in the retrieved sets
        const validIds = new Set([
          ...productsData.map((p) => p.id),
          ...productCacheData.map((p) => p.id),
        ])

        result.answer = parsed.answer
        result.referenced_internal_products = (parsed.referenced_internal_products || []).filter(
          (id: string) => validIds.has(id),
        )
      } catch (e) {
        console.error('Failed to parse tool call:', e)
        result.answer = response.choices[0]?.message?.content || result.answer
      }
    } else {
      result.answer = response.choices[0]?.message?.content || result.answer
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
