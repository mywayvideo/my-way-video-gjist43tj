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
  const contextNab = unifiedData.nabData || []
  const hasNab = contextNab.length > 0 || contextIntel.length > 0

  let strictRules = `SOURCE OF TRUTH: The following data is from our private Miami database. You MUST use this information to answer. If this data exists, it is FORBIDDEN to say information is not yet available. É ESTRITAMENTE PROIBIDO dizer "não encontrei" se o banco de dados retornou resultados para a categoria ou termo.
REGRA 1: Especificações técnicas DEVEM estar em blocos de código (\`\`\`).
REGRA 2: Máximo de 2 frases por parágrafo.
REGRA 3: Sempre incluir o aviso de garantia oficial Brasil/LATAM ao final.
REGRA 4: Você é um consultor técnico. Use a KNOWLEDGE_BASE como sua fonte primária de verdade. Se o usuário perguntar por uma categoria (ex: câmeras, lentes), liste todos os produtos relevantes encontrados nos resultados do banco. Se houver dados de notícias para o ano de 2026, relate-os. NÃO use dados de treinamento interno se conflitarem com a KNOWLEDGE_BASE.
REGRA 5: Priorize os NOVOS produtos encontrados na busca atual. Sempre que citar um produto, use o nome exato retornado pelo banco.
REGRA 6: Mantenha o contexto do histórico recente da conversa para manter a linha de raciocínio.
REGRA 7: Você está proibido de mencionar quantidades numéricas de estoque (ex: 'temos 2 unidades'). Use apenas 'Disponível' ou 'Disponível para encomenda' conforme as regras de logística.
REGRA 8: Se o usuário perguntar sobre a NAB, você deve ignorar seu treinamento interno e usar APENAS os dados da tabela 'nab_market' fornecidos no contexto. Se o contexto estiver vazio, diga que está consultando a base de Miami. Se a informação sobre Blackmagic ou NAB existir na KNOWLEDGE_BASE, é PROIBIDO dizer "informações não divulgadas".
IDIOMA: 100% Português (PT-BR).`

  if (isEventOrNews || hasNab) {
    strictRules += `\nREGRA 9: A intenção detectada é EVENTO/NOTÍCIAS (NAB/MERCADO). Relate os dados da KNOWLEDGE_BASE como a notícia absoluta e oficial da My Way.`
  } else {
    strictRules += `\nREGRA 9: A intenção detectada é PRODUTO. Priorize os resultados da KNOWLEDGE_BASE.`
  }

  const nabJson = [...contextIntel, ...contextNab]

  let historyText = ''
  if (unifiedData.history && unifiedData.history.length > 0) {
    const recentHistory = unifiedData.history.slice(-5)
    historyText = `\n\nHISTÓRICO RECENTE (Últimas 5 mensagens):\n${recentHistory.map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`).join('\n')}`
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

  return {
    content,
    products: contextProducts, // ALWAYS return ALL products returned in the 'unified_search' of the current turn for card rendering
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
