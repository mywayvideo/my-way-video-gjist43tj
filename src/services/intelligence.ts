import { supabase } from '@/lib/supabase/client'

export async function getAISettings() {
  const { data: specificSettings, error } = await supabase
    .from('ai_settings')
    .select(
      'cache_expiration_days, price_threshold_usd, search_algorithm_sql, system_prompt_template, logistics_rules_prompt, result_component_config',
    )
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle()

  if (error || !specificSettings) {
    throw new Error('Falha ao obter configurações de IA da tabela ai_settings.')
  }

  const { data: agentSettings } = await supabase
    .from('ai_agent_settings')
    .select(
      'whatsapp_trigger_low_confidence, whatsapp_trigger_purchase_keywords, whatsapp_trigger_project_keywords, whatsapp_trigger_expensive_product, confidence_threshold_for_whatsapp, max_web_search_attempts, whatsapp_trigger_keywords, system_prompt',
    )
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return { ...agentSettings, ...specificSettings }
}

export async function getActiveAgent() {
  const { data } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data
}

export async function generateResponse(query: string, unifiedData: any = {}, agentId?: string) {
  // Read settings directly to synchronize authority
  const settings = await getAISettings()

  const systemPromptTemplate = settings.system_prompt_template || ''
  const logisticsRulesPrompt = settings.logistics_rules_prompt || ''

  const systemPrompt = `${systemPromptTemplate}\n\n${logisticsRulesPrompt}`

  const contextProducts = unifiedData.products || unifiedData.stock || []
  const hasNab = (unifiedData.nabData || []).length > 0

  if (contextProducts.length === 0 && !hasNab) {
    return {
      content:
        'Não encontrei este item específico no meu catálogo de Miami, mas posso verificar com nossos fornecedores.',
      products: [],
      should_show_whatsapp_button: true,
      confidence_level: 'low',
    }
  }

  const currentContext =
    unifiedData.stringifiedContext ||
    JSON.stringify({
      products: contextProducts,
      intelligence: [...(unifiedData.intel || []), ...(unifiedData.nabData || [])],
    })

  const ruleBrazilLatam = `REGRAS OBRIGATÓRIAS E CRÍTICAS:
- Idioma: 100% Português (PT-BR).
- Parágrafos: Máximo de 2 frases por parágrafo.
- Especificações: SEMPRE apresentar especificações técnicas em blocos de código (\`\`\`).
- Produtos: Se o contexto retornar itens, apresente-os OBRIGATORIAMENTE em formato Markdown técnico.
- Garantia: SEMPRE incluir o aviso de garantia oficial no Brasil/LATAM com envio de Miami ao final.`

  const assembledPrompt = `${systemPrompt}\n\nContexto dos Dados (JSON):\n${currentContext}\n\n${ruleBrazilLatam}`

  let data: any = null
  try {
    const res = await supabase.functions.invoke('process-query', {
      body: {
        query: query,
        products: contextProducts,
        intelligence: [...(unifiedData.intel || []), ...(unifiedData.nabData || [])],
        context: currentContext,
        agentId: agentId,
        isNABQuery: hasNab,
        assembledPrompt: assembledPrompt,
        price_threshold_usd: settings.price_threshold_usd,
        whatsapp_triggers: settings.whatsapp_trigger_keywords,
      },
    })

    if (res.error) throw res.error
    data = res.data
  } catch (err) {
    console.error('Error invoking process-query:', err)
    throw new Error('Falha ao invocar a engine de inteligência (process-query).')
  }

  let result = data.message || data
  if (typeof result === 'string') {
    try {
      const start = result.indexOf('{')
      const end = result.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        result = JSON.parse(result.substring(start, end + 1))
      } else {
        result = JSON.parse(result)
      }
    } catch (e) {
      // Keep as string if not JSON
    }
  }

  return {
    content: result.content || result.message || (typeof result === 'string' ? result : ''),
    products:
      Array.isArray(result.products) && result.products.length > 0
        ? result.products
        : contextProducts,
    should_show_whatsapp_button: result.should_show_whatsapp_button || false,
    confidence_level: result.confidence_level || 'high',
  }
}

export const generateExpertResponse = generateResponse

export async function getIntelligences() {
  const { data, error } = await supabase
    .from('market_intelligence')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function ingestManualKnowledge(payload: any) {
  const { data, error } = await supabase
    .from('market_intelligence')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateIntelligenceStatus(id: string, status: any) {
  let updateData: any = {}
  if (typeof status === 'object') {
    updateData = status
  } else if (typeof status === 'boolean') {
    updateData = { is_active: status }
  } else {
    updateData = { status: status }
  }

  const { error } = await supabase.from('market_intelligence').update(updateData).eq('id', id)

  if (error) throw error
  return true
}

export async function deleteIntelligence(id: string) {
  const { error } = await supabase.from('market_intelligence').delete().eq('id', id)

  if (error) throw error
  return true
}
