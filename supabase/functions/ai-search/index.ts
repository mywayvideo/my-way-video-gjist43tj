import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

function extractJson(text: string, fallback: string): any {
  try {
    const match = text.match(/\{[\s\S]*?\}/)
    return match
      ? JSON.parse(match[0])
      : {
          message: fallback,
          confidence_level: 'low',
          should_show_whatsapp_button: true,
          referenced_internal_products: [],
        }
  } catch {
    return {
      message: fallback,
      confidence_level: 'low',
      should_show_whatsapp_button: true,
      referenced_internal_products: [],
    }
  }
}

function getFallbackMessage(query: string): string {
  const lowerQuery = query.toLowerCase()
  if (lowerQuery.match(/\b(the|is|what|how|why|where|can|you|please|help)\b/)) {
    return "I'm sorry, a technical error occurred while processing the data. Please contact a specialist."
  }
  return 'Desculpe, ocorreu um erro técnico ao processar os dados. Por favor, entre em contato com um especialista.'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    )
    const body = await req.json()
    const { query, history, currentProductId, isAdmin } = body
    const actualQuery = query.match(/User Query: (.*)/)?.[1] || query

    // 1. CAPTURA DE INTELIGÊNCIA INTEGRAL
    const [agentRes, aiRes, globalRes, compRes, providersRes] = await Promise.all([
      supabase.from('ai_agent_settings').select('*').single(),
      supabase.from('ai_settings').select('*').single(),
      supabase.from('settings').select('key, value'),
      supabase.from('company_info').select('content, type'),
      supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority_order', { ascending: true }),
    ])

    const globalSettingsMap: Record<string, string> = {}
    globalRes.data?.forEach((s: any) => {
      if (s.value) globalSettingsMap[s.key] = s.value
    })
    const institutionalContext =
      compRes.data?.find((c: any) => c.type === 'ai_knowledge')?.content || ''
    const providers = providersRes.data || []

    const settings = {
      persona: agentRes.data?.system_prompt,
      template: aiRes.data?.system_prompt_template,
      logistics: aiRes.data?.logistics_rules_prompt,
      priceLimit: aiRes.data?.price_threshold_usd,
      stopWords: aiRes.data?.custom_stop_words,
      ignoreStock: aiRes.data?.ignore_stock_flag ?? false,
      proactivity: agentRes.data?.proactivity_level ?? 5,
      temperature: aiRes.data?.temperature ?? 0.7, // MAPEAMENTO DE PRECISÃO
    }

    const tonePrompt =
      settings.proactivity >= 7 ? 'Consultor Ativo e Vendedor.' : 'Consultor Reativo.'
    const sysPrompt = `### SOBERANIA DE DADOS ###\n1. BANCO DE DADOS É A ÚNICA VERDADE.\n2. MEMÓRIA INTERNA BLOQUEADA.\n\n### PERSONA ###\n${settings.persona}\n\n### TEMPLATE ###\n${settings.template}\n\n### LOGÍSTICA ###\n${settings.logistics}\n\n### CONTEXTO INSTITUCIONAL ###\n${institutionalContext}\n\nESTILO: ${tonePrompt}`

    const tools = settings.ignoreStock
      ? []
      : [
          {
            type: 'function',
            function: {
              name: 'search_products',
              description: 'Search for products and Market Intelligence.',
              parameters: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query'],
              },
            },
          },
        ]

    let result: any = null
    let allowedProductIds = new Set<string>()
    let allReturnedProducts: any[] = []
    let hasExpensiveProduct = false

    for (const p of providers) {
      const key = Deno.env.get(p.api_key_secret_name)
      if (!key) continue

      try {
        let msgs: any[] = [{ role: 'system', content: sysPrompt }]
        if (Array.isArray(history) && history.length > 0) msgs.push(...history.slice(-6))
        msgs.push({ role: 'user', content: actualQuery })

        let calls = 0
        let finalObtained = false

        while (calls <= 2) {
          // PAYLOAD COM TEMPERATURA (PRECISÃO ADMIN)
          const payload: any = {
            model: p.model_id,
            messages: msgs,
            response_format: { type: 'json_object' },
            temperature: settings.temperature,
          }
          if (tools.length > 0) {
            payload.tools = tools
            payload.tool_choice = 'auto'
          }

          const res = await fetch(p.api_url || 'https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          if (!res.ok) break
          const resData = await res.json()
          const msg = resData.choices?.[0]?.message

          if (msg?.tool_calls) {
            msgs.push(msg)
            for (const t of msg.tool_calls) {
              const args = JSON.parse(t.function.arguments || '{}')
              let rpcData: any = { stock: [], intel: [], nab_data: [], tiers_executed: [] }
              let queryStr = args.query || actualQuery

              if (settings.stopWords) {
                const stopWordsArray = settings.stopWords
                  .split(',')
                  .map((w: string) => w.trim().toLowerCase())
                queryStr = queryStr
                  .split(' ')
                  .filter((w: string) => !stopWordsArray.includes(w.toLowerCase()))
                  .join(' ')
              }

              const { data: d1 } = await supabase.rpc('execute_ai_search', {
                search_term: queryStr,
              })
              let mergedMap = new Map()
              if (d1?.stock?.length > 0) {
                d1.stock.forEach((p: any) => mergedMap.set(p.id, p))
                rpcData.intel = d1.intel || []
                rpcData.nab_data = d1.nab_data || []
                rpcData.tiers_executed.push('Tier 1: Estoque Imediato')
              } else {
                const words = queryStr
                  .trim()
                  .split(/\s+/)
                  .filter((w: any) => w.length > 2)
                const promises = []
                if (words[1])
                  promises.push(supabase.rpc('execute_ai_search', { search_term: words[1] }))
                if (words[2])
                  promises.push(supabase.rpc('execute_ai_search', { search_term: words[2] }))
                if (words[1] && words[2])
                  promises.push(
                    supabase.rpc('execute_ai_search', { search_term: `${words[1]} ${words[2]}` }),
                  )

                const results = await Promise.all(promises)
                results.forEach((r, i) => {
                  if (r.data?.stock) {
                    r.data.stock.forEach((p: any) => mergedMap.set(p.id, p))
                    rpcData.tiers_executed.push(`Tier ${i + 2}: Refinamento`)
                  }
                })
              }

              rpcData.stock = Array.from(mergedMap.values()).sort(
                (a: any, b: any) =>
                  (b.relevance_score || 0) - (a.relevance_score || 0) ||
                  (b.price_usd || 0) - (a.price_usd || 0),
              )
              let filtered = rpcData.stock.slice(0, 15)
              filtered.forEach((p: any) => {
                allowedProductIds.add(p.id)
                if (!allReturnedProducts.some((e) => e.id === p.id)) allReturnedProducts.push(p)
                if (p.price_usd > settings.priceLimit) hasExpensiveProduct = true
              })

              const content = JSON.stringify({
                stock: filtered.map((prod: any) => ({
                  id: prod.id,
                  name: prod.name,
                  sku: prod.sku,
                  price_usd: prod.price_usd,
                  manufacturer_name: prod.manufacturer_name,
                  ncm: prod.ncm,
                })),
                intel: rpcData.intel.slice(0, 2),
                nab_data: rpcData.nab_data.slice(0, 2),
                search_metadata: {
                  tiers_active: rpcData.tiers_executed,
                  status: 'Soberania de Dados Validada',
                },
              })
              msgs.push({ role: 'tool', tool_call_id: t.id, name: t.function.name, content })
            }
            msgs.push({
              role: 'system',
              content: `DATA RECEIVED. Use 'search_metadata' to inform the user about search depth. Example: "Realizei uma busca profunda (Tier 1 e 2) para validar estoque."`,
            })
            calls++
          } else {
            result = extractJson(msg?.content || '', getFallbackMessage(actualQuery))
            finalObtained = true
            break
          }
        }
        if (finalObtained) break
      } catch (e) {
        continue
      }
    }

    if (allReturnedProducts.length === 0 && result) {
      const negRegex =
        /[^{}]*(não temos informações|não localizei|não encontrei|não localizamos)[^{}]*/gi
      result.message = (result.message || '').replace(
        negRegex,
        ' No momento, o termo exato não retornou um registro direto em nosso estoque imediato, mas como consultores MY WAY, temos acesso global e podemos viabilizar seu projeto. ',
      )
    }

    if (result && Array.isArray(result.referenced_internal_products)) {
      result.referenced_internal_products = result.referenced_internal_products.filter(
        (id: string) => allowedProductIds.has(id),
      )
    }

    const transparencyNote =
      globalSettingsMap['transparency_note'] || 'Nota: Preços sujeitos a confirmação.'
    if (result) {
      result.message = (result.message || '').trim() + '\n\n' + transparencyNote
      result.message = result.message
        .replace(/\n*## /g, '\n\n## ')
        .replace(/\n+([-*])[\s\n]*/g, '\n$1 ')
        .trim()
      if (
        hasExpensiveProduct ||
        result.confidence_level === 'low' ||
        allowedProductIds.size === 0
      ) {
        result.should_show_whatsapp_button = true
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
