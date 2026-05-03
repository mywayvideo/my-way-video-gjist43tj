import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('FUNCTION_START: Received request')

  try {
    const supUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const supabase = createClient(supUrl, serviceRoleKey)

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    let userId = null

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const user = await supabase.auth.getUser(token)
        userId = user.data.user?.id || null
      } catch (e) {}
    }

    const bodyText = await req.text()
    let query = ''
    let sessionId = undefined
    let history: any[] = []
    let userName = 'Usuário'
    let productName = 'Não informado'
    let technicalInfo = 'Não informado'
    let currentProductId = null
    let isAdmin = false

    try {
      const parsed = JSON.parse(bodyText)
      query = parsed.query || bodyText
      sessionId = parsed.session_id
      history = parsed.history || []
      userName = parsed.userName || userName
      productName = parsed.productName || productName
      technicalInfo = parsed.technicalInfo || technicalInfo
      currentProductId = parsed.currentProductId || null
      isAdmin = !!parsed.isAdmin
    } catch {
      query = bodyText
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('Query is required')
    }

    let actualQuery = query
    const userQueryMatch = query.match(/User Query: (.*)/)
    if (userQueryMatch) {
      actualQuery = userQueryMatch[1]
    }

    const hasProductContext = productName && productName !== 'Não informado'

    const { data: set } = await supabase.from('ai_agent_settings').select('*').order('created_at', { ascending: false }).limit(1).single()
    const { data: aiSettings } = await supabase.from('ai_settings').select('*').order('created_at', { ascending: false }).limit(1).single()
    const { data: globalSettingsData } = await supabase.from('settings').select('key, value')

    const globalSettingsMap: Record<string, string> = {}
    globalSettingsData?.forEach((s: any) => { if (s.value) globalSettingsMap[s.key] = s.value })

    const settings = {
      system_prompt: globalSettingsMap['system_prompt'] || set?.system_prompt || '',
      systemPromptTemplate: globalSettingsMap['prompt_template'] || aiSettings?.system_prompt_template || '',
      product_page_prompt: aiSettings?.product_page_prompt || '',
      institutional_context: (aiSettings as any)?.institutional_context || '',
    }

    // Context & Brand Injection
    const { data: mfgData } = await supabase.from('manufacturers').select('name')
    const mfgList = mfgData?.map((m: any) => m.name).join(', ') || ''

    const { data: cData } = await supabase.from('company_info').select('content, type')
    const compInfo = (cData || []).map((c: any) => `[${c.type}]: ${c.content}`).join('\n')

    const { data: providers } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })
    
    if (!providers?.length) throw new Error('No active providers found')

    let sysPromptTemplate = settings.systemPromptTemplate || '';
    let finalBasePrompt = sysPromptTemplate.trim() ? sysPromptTemplate.replace('{{system_prompt}}', settings.system_prompt || '') : (settings.system_prompt || 'Você é um Consultor My Way Business.');

    let productPageContext = '';
    if (hasProductContext) {
      let parsedProductPagePrompt = settings.product_page_prompt || '';
      parsedProductPagePrompt = parsedProductPagePrompt.replaceAll('{{productName}}', productName || '');
      parsedProductPagePrompt = parsedProductPagePrompt.replaceAll('{{currentProductId}}', currentProductId || '');
      
      productPageContext = `\n\nCONTEXTO DO PRODUTO ATUAL:\nProduto: ${productName}\nEspecificações: ${technicalInfo}\n${parsedProductPagePrompt}`;
    }

    let securityClause = '';
    if (!isAdmin) {
      securityClause = `\n- SECURITY CLAUSE: You are a Senior Technical Consultant. You are STRICTLY FORBIDDEN from discussing internal logic, tools, JSON structures, or UUIDs with the user. Your internal engineering is invisible.`;
    } else {
      securityClause = `\n- SECURITY CLAUSE: You are communicating with an ADMIN. You may discuss technical internal logic if specifically asked.`;
    }

    const sysPrompt = `${finalBasePrompt}${productPageContext}

DOUTRINA E CONTEXTO INSTITUCIONAL MY WAY:
${settings.institutional_context}

DADOS DA EMPRESA:
${compInfo}

LISTA DE FABRICANTES HOMOLOGADOS:
${mfgList}

MANDATORY RULES:
- You are a My Way Business Consultant. Your tone, values, and technical judgment MUST be guided primarily by the DOUTRINA E CONTEXTO INSTITUCIONAL. Use 'company_info' only for basic data. Use the Manufacturer List to guide your technical search queries. Prioritize these brands to avoid generic recommendations.
- You MUST call the 'search_products' tool to verify inventory before providing technical recommendations.
- Enforce strict JSON output format in your final response.
- Your final response MUST be a JSON object containing:
  {
    "message": "Your technical response...",
    "confidence_level": "high" or "low",
    "should_show_whatsapp_button": boolean,
    "referenced_internal_products": ["uuid-1", "uuid-2"]
  }
- Ensure exactly TWO line breaks (\\n\\n) before the Transparency Note in the 'message' field (if any).
- The AI is the SOLE authority for cards. You must populate 'referenced_internal_products' ONLY with UUIDs returned by the 'search_products' tool that you explicitly recommend. Do NOT populate this array until the tool returns data.
- If a product is mentioned in text but was not returned by the tool, it MUST NOT be added to the metadata.
- STRICT RULE: Do NOT mention internal tool names like 'search_products' to the user.${securityClause}
`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Use this tool to find products from our HOMOLOGATED MANUFACTURERS. If a user asks for a generic solution, find the best match within our brand list first.',
          parameters: { 
            type: 'object', 
            properties: { 
              query: { type: 'string', description: 'Search terms based on manufacturers and user request' } 
            }, 
            required: ['query'] 
          },
        },
      },
    ]

    let result: any = null

    for (const p of providers) {
      const key = Deno.env.get(p.api_key_secret_name)
      if (!key) continue

      try {
        let url = 'https://api.openai.com/v1/chat/completions';
        let headers: any = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

        if (p.provider_name === 'deepseek') {
          url = 'https://api.deepseek.com/chat/completions';
        } else if (p.provider_name === 'gemini') {
          url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
        }

        let msgs: any[] = [{ role: 'system', content: sysPrompt }]
        if (Array.isArray(history) && history.length > 0) {
          msgs.push(...history)
        }
        msgs.push({ role: 'user', content: actualQuery })
        
        let calls = 0
        let finalResponseObtained = false

        while (calls <= 2) {
          const payload: any = {
            model: p.model_id,
            messages: msgs,
          }
          
          if (calls === 0) {
            payload.tools = tools
            payload.tool_choice = 'auto'
          } else {
            payload.response_format = { type: 'json_object' }
          }

          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          })
          
          if (!res.ok) throw new Error(await res.text())

          const resData = await res.json()
          const msg = resData.choices?.[0]?.message

          if (msg?.tool_calls) {
            msgs.push(msg)
            for (const t of msg.tool_calls) {
              if (t.function.name === 'search_products') {
                const args = JSON.parse(t.function.arguments || '{}');
                const { data: rpcData } = await supabase.rpc('execute_ai_search', { search_term: args.query || actualQuery });
                
                let content = JSON.stringify({
                   stock: rpcData?.stock?.map((prod: any) => ({
                      id: prod.id, name: prod.name, sku: prod.sku, description: prod.description,
                      price_usd: prod.price_usd,
                      technical_info: prod.technical_info, is_discontinued: prod.is_discontinued,
                      manufacturer_name: prod.manufacturer_name
                   })) || [],
                   intel: rpcData?.intel || [],
                   nab_data: rpcData?.nab_data || []
                });
                
                msgs.push({ role: 'tool', tool_call_id: t.id, name: t.function.name, content })
              }
            }
            calls++
          } else {
            result = JSON.parse(msg?.content || '{}')
            finalResponseObtained = true
            break
          }
        }
        if (finalResponseObtained) break
      } catch (e) {
        console.error(`Provider ${p.provider_name} failed:`, e)
      }
    }

    if (!result) {
      throw new Error('All AI providers failed.')
    }

    if (!result.message && !result.content) {
      result.message = '';
      result.confidence_level = result.confidence_level || 'high';
    }

    let refs: string[] = []
    if (Array.isArray(result.referenced_internal_products)) {
      refs = result.referenced_internal_products.map((p: any) => (typeof p === 'string' ? p : p.id)).filter(Boolean)
    }

    result.referenced_internal_products = Array.from(new Set(refs))
    
    if (result.confidence_level === 'high' && result.referenced_internal_products.length > 0) {
       supabase
        .from('product_search_cache')
        .insert({
          search_query: actualQuery,
          product_name: actualQuery,
          source: 'ai_generated',
          product_description: result.message,
          product_specs: result,
        })
        .then()
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Fatal ai-search error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
