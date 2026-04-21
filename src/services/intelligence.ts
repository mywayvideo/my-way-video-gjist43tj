import { supabase } from '@/lib/supabase/client'

export async function getAISettings() {
  const { data: specificSettings, error } = await supabase
    .from('ai_settings')
    .select(
      'cache_expiration_days, price_threshold_usd, search_algorithm_sql, system_prompt_template, logistics_rules_prompt, result_component_config, ignore_stock_count',
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

  return data && data.length > 0 ? data[0] : null
}

export async function getActiveAgents() {
  const { data } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true })

  return data || []
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
    qLower.includes('lançamentos') ||
    qLower.includes('novidade') ||
    qLower.includes('novidades') ||
    qLower.includes('tendência')

  const contextProducts = unifiedData.products || unifiedData.stock || []
  const contextIntel = unifiedData.intel || []
  const contextNab = unifiedData.nabData || unifiedData.nab_data || []
  const hasNab = contextNab.length > 0 || contextIntel.length > 0

  const contextPriority = `Você é o Consultor Sênior da My Way. O campo 'OFFICIAL_MIAMI_INTELLIGENCE' é a sua única fonte de verdade para notícias e tendências. Se o usuário perguntar sobre a NAB 2026, você deve ler o resumo da URSA Cine 100G e do ATEM IP que está no contexto e apresentar com autoridade máxima. É PROIBIDO dizer que as informações não foram divulgadas.`

  let strictRules = `${contextPriority}
FILTRAGEM DE INTENÇÃO SEMÂNTICA:
REGRA 1 (Comparação): Se o usuário pedir para comparar produtos, foque 100% nas especificações técnicas. É PROIBIDO mencionar notícias da NAB a menos que os produtos comparados sejam lançamentos da NAB. Use o histórico para manter o contexto da comparação se um produto foi mencionado no turno anterior.
REGRA 2 (Filtro de Marca): Se o usuário perguntar sobre uma marca específica (ex: "Blackmagic na NAB"), filtre mentalmente a KNOWLEDGE_BASE e mencione APENAS essa marca. É PROIBIDO listar notícias de outras marcas (ex: Canon, Sony, Datavideo) em uma consulta específica de marca.
REGRA 3 (Sem Títulos Crus): É PROIBIDO imprimir títulos brutos do banco de dados (ex: "Canon na NAB 2026"). Sintetize as informações em uma narrativa profissional.

REGRAS DE FORMATAÇÃO ESTRITA:
REGRA 4: Especificações técnicas DEVEM SEMPRE estar em blocos de código usando crases triplas (\`\`\`).
REGRA 5: Parágrafos: Máximo de 2 frases.
REGRA 6: SEMPRE inclua o aviso de garantia oficial Brasil/LATAM ao final ("Todos os serviços e produtos da My Way estão cobertos pela nossa garantia oficial Brasil/LATAM.").
REGRA 7: Idioma: 100% Português (PT-BR). Mantenha um tom de consultor profissional, evitando "não sei" se os dados estiverem no contexto.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
Retorne APENAS um objeto JSON válido com a seguinte estrutura. O campo content é a sua resposta em Markdown:
{
  "content": "Sua resposta formatada...",
  "referenced_internal_products": ["id_1", "id_2"] // Inclua os IDs apenas dos produtos explicitamente comparados ou mencionados de forma relevante
}`

  const nabJson = [...contextIntel, ...contextNab].map((item: any) => {
    if (item.ai_summary) {
      return {
        title: item.title || '',
        OFFICIAL_MIAMI_INTELLIGENCE: item.ai_summary,
        raw_content: item.raw_content || item.content || '',
      }
    }
    return item
  })

  let historyText = ''
  if (unifiedData.history && unifiedData.history.length > 0) {
    const recentHistory = unifiedData.history.slice(-6)
    historyText = `\n\nHISTÓRICO RECENTE (Últimas 6 mensagens):\n${recentHistory.map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`).join('\n')}`
  }

  // Contexto Institucional
  const { data: cData } = await supabase.from('company_info').select('content, type')
  const contexto_institucional = (cData || [])
    .map((c: any) => `[${c.type}]: ${c.content}`)
    .join('\n')

  const KNOWLEDGE_BASE = `
1) Contexto Institucional:
${contexto_institucional}

2) Produtos Encontrados:
${JSON.stringify(contextProducts)}

3) Notícias e Inteligência (NAB/Mercado):
${JSON.stringify(nabJson)}
`

  const finalPromptWithContext = `${systemPromptTemplate}\n\n${logisticsRulesPrompt}\n\n${strictRules}\n\nKNOWLEDGE_BASE:\n${KNOWLEDGE_BASE}\n\n${historyText}`

  const currentContext = contextProducts

  const agents = await getActiveAgents()
  const agentsToTry = agentId ? agents.filter((a) => a.id === agentId) : agents

  if (agentsToTry.length === 0) {
    throw new Error('Nenhum provedor de IA ativo encontrado.')
  }

  let data: any = null
  let lastError: any = null

  // Triggers
  const whatsappTriggers = settings.whatsapp_trigger_keywords || []
  const confidenceThreshold = settings.confidence_threshold_for_whatsapp || 'low'

  for (const agent of agentsToTry) {
    try {
      const res = await supabase.functions.invoke('process-query', {
        body: {
          query: query,
          products: contextProducts,
          intelligence: nabJson,
          context: currentContext,
          agentId: agent.id,
          isNABQuery: hasNab || isEventOrNews,
          assembledPrompt: finalPromptWithContext,
          price_threshold_usd: settings.price_threshold_usd,
          whatsapp_triggers: whatsappTriggers,
          temperature: 0.1,
        },
      })

      if (res.error) throw res.error
      data = res.data
      break // Se sucesso, sai do loop
    } catch (err) {
      console.error(`Error invoking process-query with agent ${agent.provider_name}:`, err)
      lastError = err
    }
  }

  if (!data) {
    throw new Error('Falha ao invocar a engine de inteligência em todos os provedores ativos.')
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

  const content = result.content || result.message || (typeof result === 'string' ? result : '')
  let confidence = result.confidence_level || 'high'
  let showWhatsapp = result.should_show_whatsapp_button || false

  // Trigger Sync (Section C):
  const triggerMatch = whatsappTriggers.some((kw: string) => qLower.includes(kw.toLowerCase()))
  if (triggerMatch || confidence === confidenceThreshold || confidence === 'low') {
    showWhatsapp = true
  }

  // Se algum produto no contexto for caro
  const hasExpensive = contextProducts.some((p: any) => p.is_expensive)
  if (hasExpensive) {
    showWhatsapp = true
  }

  let referencedProducts = contextProducts
  if (
    result.referenced_internal_products &&
    Array.isArray(result.referenced_internal_products) &&
    result.referenced_internal_products.length > 0
  ) {
    referencedProducts = contextProducts.filter((p: any) =>
      result.referenced_internal_products.includes(p.id),
    )
  } else {
    referencedProducts = [] // UI MUST ONLY render ProductCards explicitly mentioned
  }

  return {
    content,
    products: referencedProducts,
    nabData: contextNab,
    intel: contextIntel,
    should_show_whatsapp_button: showWhatsapp,
    confidence_level: confidence,
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
