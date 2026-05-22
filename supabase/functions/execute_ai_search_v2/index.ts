import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { loadCacheSettings } from '../../_shared/cacheSettings.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =========================
// HELPERS DE ALTA CONFIABILIDADE
// =========================

async function hashQuery(query: string, context: string = ''): Promise<string> {
  const text = `${query.toLowerCase().trim()}|${context}`
  const msgUint8 = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeJSONParse(str: string, fallback: any = null): any {
  if (!str || typeof str !== 'string') return fallback
  try {
    return JSON.parse(str)
  } catch (e) {
    const match = str.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch (e2) {
        return fallback
      }
    }
    return fallback
  }
}

function sanitizeInput(text: any): string {
  if (text === null || text === undefined) return ''
  return String(text)
    .replace(/[^a-zA-Z0-9\sÀ-ÿ\-_\.\,\?\!\(\)\"\'\:\/\+\%\@\#\&\|]/g, '')
    .slice(0, 3000)
}

const isUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)

function getHeuristicIntent(query: string, currentProductId: string | null): string {
  const q = query.toLowerCase()
  if (
    ['horário', 'quem somos', 'localização', 'garantia', 'logística', 'endereço', 'contato'].some(
      (t) => q.includes(t),
    )
  )
    return 'INSTITUTIONAL'
  if (currentProductId || /\b(sony|canon|blackmagic|atem|fx3|fx6|r5|r6|pocket|6k|4k)\b/i.test(q))
    return 'PRODUCT_SPECIFIC'
  return 'GENERIC'
}

async function checkRateLimit(supabase: any, identifier: string, limit: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_ai_rate_limit', {
    user_identifier: identifier,
    max_requests: limit,
  })
  if (error) {
    console.error('[RATE LIMIT ERROR]', error)
    return true
  }
  return data as boolean
}

serve(async (req: Request) => {
  console.log('[LOG] Request iniciada') // Log de entrada garantido
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const startTime = performance.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)
  const metadata: any = { steps: [], tool_calls: 0, cache_hit: false }

  try {
    const forwarded = req.headers.get('x-forwarded-for')
    const clientIP = forwarded
      ? forwarded.split(',')[0].trim()
      : req.headers.get('x-real-ip') || 'unknown'

    let body: any = null
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: corsHeaders,
        status: 400,
      })
    }

    const query = sanitizeInput(body?.query)
    console.log(`[LOG] Query recebida: "${query}"`)

    if (!query.trim())
      return new Response(
        JSON.stringify({ message: 'Como posso ajudar?', referenced_internal_products: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )

    const session_id = typeof body?.session_id === 'string' ? body.session_id : null
    const currentProductId =
      typeof body?.currentProductId === 'string' && isUUID(body.currentProductId)
        ? body.currentProductId
        : null
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 2. DOUBLE RATE LIMITING
    const [ipAllowed, sessionAllowed] = await Promise.all([
      checkRateLimit(supabase, `ip:${clientIP}`, 20),
      session_id ? checkRateLimit(supabase, `session:${session_id}`, 50) : Promise.resolve(true),
    ])

    if (!ipAllowed || !sessionAllowed) {
      console.log('[LOG] Rate limit atingindo')
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 },
      )
    }

    const { productCacheExpirationDays } = await loadCacheSettings()
    const intent = getHeuristicIntent(query, currentProductId)

    const [
      { data: agentSettings },
      { data: aiSettings },
      { data: companyInfo },
      { data: globalSettings },
    ] = await Promise.all([
      supabase.from('ai_agent_settings').select('*').maybeSingle(),
      supabase.from('ai_settings').select('*').maybeSingle(),
      supabase.from('company_info').select('content').maybeSingle(),
      supabase.from('settings').select('key, value'),
    ])

    const globalSettingsMap: Record<string, string> = {}
    if (Array.isArray(globalSettings))
      globalSettings.forEach((s) => {
        if (s.key) globalSettingsMap[s.key] = s.value
      })

    // 4. BRANCH INSTITUCIONAL
    if (intent === 'INSTITUTIONAL') {
      const response = {
        message: companyInfo?.content || 'Somos a My Way Video.',
        confidence_level: 'high',
        referenced_internal_products: [],
      }
      if (session_id)
        await supabase
          .from('chat_messages')
          .insert({ session_id, role: 'assistant', content: response.message })
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. CACHE CHECK
    const queryHash = await hashQuery(query, `${currentProductId || 'global'}`)
    const pcQuery = supabase
      .from('product_cache')
      .select('response_text')
      .eq('query_hash', queryHash)
    if (productCacheExpirationDays > 0)
      pcQuery.gte(
        'created_at',
        new Date(Date.now() - productCacheExpirationDays * 86400000).toISOString(),
      )
    const { data: cached } = await pcQuery.maybeSingle()
    if (cached) {
      console.log('[LOG] Cache hit')
      const result = safeJSONParse(cached.response_text)
      if (result)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // 6. HISTÓRICO E GROUNDING
    let history: any[] = []
    if (session_id) {
      const { data: histRows } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(6)
      if (histRows)
        history = histRows
          .reverse()
          .map((r) => ({ role: r.role, content: sanitizeInput(r.content).slice(0, 1000) }))
    }

    const allowedIds = new Set<string>()
    if (currentProductId) allowedIds.add(currentProductId)

    const systemPrompt = `### IDENTIDADE\n${agentSettings?.system_prompt || ''}\n### REGRAS\n1. Grounding OBRIGATÓRIO via 'search_products'. 2. NUNCA responda fora do domínio audiovisual profissional. 3. Resposta apenas JSON.`
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: query },
    ]
    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Busca produtos reais no catálogo My Way.',
          parameters: {
            type: 'object',
            properties: { term: { type: 'string' } },
            required: ['term'],
          },
        },
      },
    ]

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
        tool_choice: 'required',
      }),
      signal: controller.signal,
    })

    if (!aiResponse.ok) throw new Error(`OpenAI Tool Error: ${aiResponse.status}`)
    const aiData = await aiResponse.json()
    const aiMessage = aiData?.choices?.[0]?.message
    if (!aiMessage) throw new Error('Invalid OpenAI Response')

    let keywordScore = 0,
      productsFound = 0,
      searchPerformed = false
    if (aiMessage.tool_calls) {
      searchPerformed = true
      messages.push({
        role: 'assistant',
        content: aiMessage.content ?? '',
        tool_calls: aiMessage.tool_calls,
      })
      for (const toolCall of aiMessage.tool_calls.slice(0, 3)) {
        if (toolCall.function.name !== 'search_products') continue
        const args = safeJSONParse(toolCall.function.arguments, {})
        const searchTerm =
          typeof args.term === 'string' ? sanitizeInput(args.term).slice(0, 300) : query

        const tokens = searchTerm
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 1)
        const { data: keywords } = await supabase
          .from('avpro_keywords')
          .select('keyword, weight, is_blocking')
          .in('keyword', tokens)
        if (keywords?.some((k) => k.is_blocking))
          return new Response(
            JSON.stringify({
              message: 'Termo fora de escopo.',
              confidence_level: 'low',
              referenced_internal_products: [],
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )

        keywordScore += keywords?.reduce((acc, k) => acc + Number(k.weight || 0), 0) || 0
        const queryBoost = Math.min(
          3.0,
          1.0 + (keywords?.reduce((acc, k) => acc + Number(k.weight), 0) || 0),
        )
        const { data: products, error: rpcError } = await supabase.rpc('search_products_v2', {
          search_term: searchTerm,
          boost_multiplier: queryBoost,
        })
        if (rpcError) throw new Error('Search engine failure')

        productsFound += products?.length || 0
        products?.forEach((p: any) => allowedIds.add(p.id))
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(products || []),
        })
      }

      if (keywordScore < 1.0 && productsFound === 0 && intent !== 'PRODUCT_SPECIFIC') {
        return new Response(
          JSON.stringify({
            message:
              'Posso ajudar apenas com audiovisual profissional e produtos do catálogo My Way.',
            confidence_level: 'low',
            referenced_internal_products: [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
        signal: controller.signal,
      })
      const finalData = await finalResponse.json()
      aiMessage.content = finalData?.choices?.[0]?.message?.content
    }

    // 7. VALIDAÇÃO FINAL E GRAVAÇÃO DE CACHE
    let result = safeJSONParse(aiMessage.content, {
      message: 'Erro ao processar.',
      referenced_internal_products: [],
      confidence_level: 'low',
    })
    if (typeof result !== 'object' || Array.isArray(result))
      result = {
        message: 'Erro ao processar.',
        referenced_internal_products: [],
        confidence_level: 'low',
      }

    // Filtro de IDs: Garante que os cards apareçam apenas se os IDs forem válidos
    console.log(`[LOG] IDs sugeridos pela IA: ${result.referenced_internal_products}`)
    result.referenced_internal_products = (result.referenced_internal_products || []).filter(
      (id: string) => allowedIds.has(id),
    )
    console.log(`[LOG] IDs validados: ${result.referenced_internal_products}`)

    if (currentProductId) result.message += '\n\n' + (globalSettingsMap['transparency_note'] || '')

    if (
      searchPerformed &&
      result.confidence_level === 'high' &&
      result.referenced_internal_products.length > 0
    ) {
      await supabase.from('product_cache').upsert({
        query_hash: queryHash,
        response_text: JSON.stringify(result),
        created_at: new Date().toISOString(),
      })
    }

    if (session_id)
      await supabase.from('chat_messages').insert([
        { session_id, role: 'user', content: query },
        { session_id, role: 'assistant', content: result.message },
      ])

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' ? 'Request timeout' : error.message
    console.error('[ERRO CRÍTICO]', errorMsg)
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  } finally {
    clearTimeout(timeoutId)
  }
})
