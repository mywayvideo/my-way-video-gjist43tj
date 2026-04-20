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
    throw new Error(
      'Falha ao carregar ai_settings do banco de dados. Verifique a conexão ou os dados da tabela.',
    )
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

  if (!systemPromptTemplate || systemPromptTemplate.trim() === '') {
    throw new Error(
      'Configuração de sistema (system_prompt_template) vazia ou não encontrada. Operação abortada.',
    )
  }

  const qLower = query.toLowerCase()
  const isEventOrNews =
    qLower.includes('nab') ||
    qLower.includes('lançamento') ||
    qLower.includes('novidade') ||
    qLower.includes('tendência')

  const contextProducts = unifiedData.products || unifiedData.stock || []
  const contextIntel = unifiedData.intel || []
  const contextNab = unifiedData.nabData || []
  const hasNab = contextNab.length > 0 || contextIntel.length > 0

  if (contextProducts.length === 0 && !hasNab) {
    return {
      content:
        'Não encontrei este item específico no meu catálogo de Miami, mas posso verificar com nossos fornecedores.',
      products: [],
      should_show_whatsapp_button: true,
      confidence_level: 'low',
    }
  }

  let strictRules = `REGRA 1: Máximo de 2 frases por parágrafo.
REGRA 2: Especificações técnicas DEVEM estar em blocos de código (\`\`\`).
REGRA 3: Sempre incluir o aviso de garantia oficial Brasil/LATAM ao final.
REGRA 4: Se a busca retornar produtos diferentes da mensagem anterior, reconheça a mudança de assunto (ex: "Entendido, sobre o [Novo Produto]...").
REGRA 5: Priorize os NOVOS produtos encontrados na busca atual em relação a qualquer contexto anterior.
IDIOMA: 100% Português (PT-BR).
DISPONIBILIDADE: Se o produto está no catálogo, assuma que está disponível para envio imediato de Miami.`

  if (isEventOrNews) {
    strictRules += `\nREGRA 6: A intenção detectada é EVENTO/NOTÍCIAS. Resuma as novidades e tendências (nab_data / intel) PRIMEIRO, e DEPOIS liste os produtos relacionados do catálogo (stock).`
  } else {
    strictRules += `\nREGRA 6: A intenção detectada é PRODUTO. Priorize os resultados do catálogo (stock) e foque nas especificações e disponibilidade.`
  }

  const assembledPrompt = `${systemPromptTemplate}\n\n${logisticsRulesPrompt}\n\n${strictRules}\n\nDADOS REAIS DO CATÁLOGO: ${JSON.stringify(contextProducts)}`

  const currentContext = contextProducts

  let data: any = null
  try {
    const res = await supabase.functions.invoke('process-query', {
      body: {
        query: query,
        products: contextProducts,
        intelligence: [...contextIntel, ...contextNab],
        context: currentContext,
        agentId: agentId,
        isNABQuery: hasNab || isEventOrNews,
        assembledPrompt: assembledPrompt,
        price_threshold_usd: settings.price_threshold_usd,
        whatsapp_triggers: settings.whatsapp_trigger_keywords,
        temperature: 0.2,
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
