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

  let systemPromptTemplate = settings.system_prompt_template || ''
  const logisticsRulesPrompt = settings.logistics_rules_prompt || ''

  if (!systemPromptTemplate || systemPromptTemplate.trim() === '') {
    systemPromptTemplate =
      'Você é o Especialista My Way Business. Sua prioridade é o hardware de maior valor (price_usd) retornado pela busca. É PROIBIDO omitir cards de produtos mencionados no texto. Siga as instruções da Section G para logística.'
  }

  const qLower = query.toLowerCase()

  // Language Rule Detection - Enforce PT-BR for all AI responses as requested in the final constraints
  const detectedLanguage = 'PT-BR'
  const warrantyDisclaimer =
    'Todos os serviços e produtos da My Way estão cobertos pela nossa garantia oficial Brasil/LATAM.'
  const isEventOrNews =
    qLower.includes('nab ') ||
    qLower.includes(' nab') ||
    qLower.includes('feira') ||
    qLower.includes('evento')

  const isComparison =
    qLower.includes('compar') ||
    qLower.includes('vs') ||
    qLower.includes('versus') ||
    qLower.includes('diferença') ||
    qLower.includes('qual o melhor') ||
    qLower.includes('qual a melhor') ||
    qLower.includes('indique') ||
    qLower.includes('opções')

  const contextProducts = unifiedData.products || unifiedData.stock || []
  let contextIntel = unifiedData.intel || []
  let contextNab = unifiedData.nabData || unifiedData.nab_data || []

  // Supressão de Ruído: Descartar notícias e informações de mercado se for uma comparação
  if (isComparison) {
    contextIntel = []
    contextNab = []
  }

  const hasNab = contextNab.length > 0 || contextIntel.length > 0

  let strictRules = `PRIORIDADE MÁXIMA DE RESPOSTA:
1. Você é o Consultor Sênior da My Way. ALTA PRIORIDADE: Siga estritamente as instruções definidas no prompt do sistema (system_instructions).
2. HIERARQUIA E NAB: Você é PROIBIDO de mencionar NAB ou eventos a menos que o usuário pergunte explicitamente por novidades. Use informações de mercado apenas como selo de autoridade técnica.
3. FILTRAGEM DE INTENÇÃO E AUTORIDADE:
REGRA 1: Priorize o hardware de maior valor (price_usd) retornado pela busca. Se o usuário perguntar por um produto específico, priorize-o absolutamente.
REGRA 2: Você DEVE fornecer pelo menos dois fabricantes diferentes em cada recomendação que envolva mais de um produto, exceto se o usuário pedir uma marca específica.
REGRA 3 (Preços): Todas as menções a preços DEVEM corresponder exatamente ao campo 'price_usd' fornecido no banco de dados.
REGRA 4: É PROIBIDO fazer comparações não solicitadas. Apenas compare produtos se o usuário perguntar explicitamente "Qual a melhor?", "Compare X com Y" ou "Indique boas opções".
REGRA 5 (Vinculação de Produtos): Você DEVE retornar os IDs exatos dos produtos cujos nomes foram citados no seu texto de resposta.
REGRA 6: É proibido inserir IDs de produtos no texto, use apenas os nomes e mande os IDs na propriedade 'referenced_internal_products'. É PROIBIDO omitir cards de produtos mencionados no texto.

REGRAS DE FORMATAÇÃO ESTRITA:
REGRA 7: Especificações técnicas DEVEM SEMPRE estar em blocos de código usando crases triplas (\`\`\`).
REGRA 8: Parágrafos: Máximo de 2 frases por parágrafo.
REGRA 9: SEMPRE inclua o aviso de garantia oficial ao final ("${warrantyDisclaimer}").
REGRA 10: Idioma: TODAS AS RESPOSTAS DEVEM SER EM PORTUGUÊS (PT-BR), independentemente do idioma da pergunta.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
Retorne APENAS um objeto JSON válido com a seguinte estrutura. O campo content é a sua resposta em Markdown:
{
  "content": "Sua resposta formatada...",
  "referenced_internal_products": ["id_1", "id_2"] // OBRIGATÓRIO: Inclua TODOS os IDs exatos dos produtos mencionados, priorizando os de maior valor (price_usd).
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

  let referencedProducts = []

  // Ensure products explicitly mentioned by name in the text are always included
  const contentLowerForMatch = content.toLowerCase()
  const forcedMatches = contextProducts.filter((p: any) => {
    const pName = (p.name || '').toLowerCase()

    // Match by 2 or more significant words in the name
    const importantWords = pName.split(' ').filter((w: string) => w.length > 3)
    if (importantWords.length >= 2) {
      const matches = importantWords.filter((w: string) => contentLowerForMatch.includes(w))
      return matches.length >= 2
    }
    return false
  })

  let aiMentionedProducts: any[] = []
  if (
    result.referenced_internal_products &&
    Array.isArray(result.referenced_internal_products) &&
    result.referenced_internal_products.length > 0
  ) {
    aiMentionedProducts = contextProducts.filter((p: any) =>
      result.referenced_internal_products.includes(p.id),
    )
  }

  // Combine forced matches based on text with AI returned IDs
  referencedProducts = [...aiMentionedProducts, ...forcedMatches].filter(
    (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
  )

  // Sort referenced products by price_usd DESC
  referencedProducts = referencedProducts.sort((a: any, b: any) => {
    return (b.price_usd || 0) - (a.price_usd || 0)
  })

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
