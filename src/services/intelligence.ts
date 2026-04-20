import { supabase } from '@/lib/supabase/client'

export const searchIntelligence = async (query: string) => {
  return []
}

export const getIntelligences = async () => {
  try {
    const { data, error } = await supabase
      .schema('public')
      .from('market_intelligence')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching intelligences:', error)
    return []
  }
}

export const ingestManualKnowledge = async (payload: {
  title: string
  source_url?: string
  raw_content?: string
  status?: string
}) => {
  try {
    const { data, error } = await supabase
      .schema('public')
      .from('market_intelligence')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error ingesting knowledge:', error)
    return null
  }
}

export const updateIntelligenceStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await supabase
      .schema('public')
      .from('market_intelligence')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating intelligence status:', error)
    return null
  }
}

export const deleteIntelligence = async (id: string) => {
  try {
    const { error } = await supabase
      .schema('public')
      .from('market_intelligence')
      .delete()
      .eq('id', id)
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting intelligence:', error)
    return false
  }
}

export const getActiveAgent = async () => {
  try {
    const { data, error } = await supabase
      .schema('public')
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })
      .limit(1)
      .single()
    if (error) {
      if (error.code !== 'PGRST116') throw error
      return null
    }
    return data
  } catch (error) {
    console.error('Error fetching active agent:', error)
    return null
  }
}

export const generateExpertResponse = async (query: string, unifiedData: any, agentId?: string) => {
  try {
    const settings = unifiedData.settings || {}
    let confidence_level = 'high'
    let isPurchaseIntent = false

    const qLower = query.toLowerCase()

    if (settings.whatsapp_trigger_purchase_keywords) {
      const keywords = settings.whatsapp_trigger_keywords || [
        'comprar',
        'orçamento',
        'quanto custa',
        'disponível',
        'preço',
        'tabela de preços',
        'cotação',
        'desconto',
        'promoção',
      ]
      if (keywords.some((k: string) => qLower.includes(k.toLowerCase()))) {
        isPurchaseIntent = true
      }
    }

    if (settings.whatsapp_trigger_project_keywords) {
      const projectKeywords = [
        'integração',
        'solução completa',
        'customização',
        'setup',
        'instalação',
        'projeto',
        'implementação',
        'sistema completo',
      ]
      if (projectKeywords.some((k: string) => qLower.includes(k))) {
        confidence_level = 'low'
      }
    }

    let shouldShowWhatsapp = false

    if (
      settings.whatsapp_trigger_expensive_product &&
      unifiedData.stock &&
      unifiedData.stock.length > 0
    ) {
      const threshold = settings.price_threshold_usd || 5000
      if (unifiedData.stock.some((p: any) => (p.price_usd || 0) > threshold)) {
        confidence_level = 'low'
        shouldShowWhatsapp = true
      }
    }

    if (settings.whatsapp_trigger_low_confidence) {
      if (
        (!unifiedData.stock || unifiedData.stock.length === 0) &&
        (!unifiedData.intel || unifiedData.intel.length === 0)
      ) {
        confidence_level = 'low'
        shouldShowWhatsapp = true
      }
    }

    const systemPrompt = `Você é o Especialista My Way. 
Sua resposta deve ser um JSON válido. O campo 'content' deve conter o texto formatado em Markdown. O campo 'products' deve conter a lista de objetos de produtos encontrados.
Ignore COMPLETAMENTE qualquer campo de 'stock', 'quantity' ou 'estoque' vindo do banco de dados.
Se o produto existe na lista 'stock' enviada no contexto, ele ESTÁ DISPONÍVEL.
É terminantemente PROIBIDO dizer que o produto não está disponível ou que o estoque está vazio.
Considere a presença no banco de dados como prova de disponibilidade imediata em Miami.
Sua resposta DEVE começar diretamente confirmando o produto: "Sim, temos a [Nome do Produto] disponível...".
Use 'intel' e 'nabData' apenas para detalhes técnicos adicionais.
NUNCA mencione a NAB a menos que o usuário pergunte explicitamente ou o dado seja relevante.
Você deve obedecer RIGOROSAMENTE aos gatilhos do painel Admin. Se o gatilho de compra estiver ativo, foque na conversão imediata.
${isPurchaseIntent ? 'GATILHO DE COMPRA ATIVO: Seja extremamente assertivo sobre o estoque e o preço. Feche a venda.' : ''}
Responda SEMPRE em Português (PT-BR).
Mantenha os parágrafos com no máximo 2 frases.
Use Markdown padrão. Use **negrito** para nomes de produtos e preços. Use blocos de código com \`\`\` para especificações. Nunca use caracteres especiais fora do padrão Markdown.
Sempre inclua: Disponível para envio imediato de Miami com garantia no Brasil no campo 'content'.`

    const enhancedQuery = `${systemPrompt}\n\nDADOS DO SISTEMA (VERDADE ABSOLUTA):\n${JSON.stringify(
      {
        stock: unifiedData.stock,
        intel: unifiedData.intel,
        nabData: unifiedData.nabData,
        web: unifiedData.web,
      },
    )}\n\nPergunta do usuário: ${query}`

    const { data, error } = await supabase.functions.invoke('process-query', {
      body: {
        query: enhancedQuery,
        products: unifiedData.stock || [],
        intelligence: [
          ...(unifiedData.intel || []),
          ...(unifiedData.nabData || []),
          ...(unifiedData.web || []),
        ],
        agentId,
        isNABQuery: query.toLowerCase().includes('nab'),
      },
    })

    if (error) throw error

    let parsedResponse: any = {}
    let rawMessage = data?.message || data?.content || ''

    try {
      const startBracket = rawMessage.indexOf('{')
      const endBracket = rawMessage.lastIndexOf('}')
      if (startBracket !== -1 && endBracket !== -1) {
        parsedResponse = JSON.parse(rawMessage.substring(startBracket, endBracket + 1))
      } else {
        parsedResponse = JSON.parse(rawMessage)
      }
    } catch (e) {
      parsedResponse = { content: rawMessage }
    }

    let finalMessage =
      parsedResponse.content ||
      parsedResponse.message ||
      rawMessage ||
      buildFallbackMessage(query, unifiedData)
    let finalProducts = parsedResponse.products || data?.products || unifiedData.stock || []

    if (!finalMessage.includes('Disponível para envio imediato de Miami com garantia no Brasil')) {
      finalMessage += '\n\nDisponível para envio imediato de Miami com garantia no Brasil.'
    }

    return {
      content: finalMessage,
      message: finalMessage,
      confidence_level,
      products: finalProducts,
      should_show_whatsapp_button: shouldShowWhatsapp || confidence_level === 'low',
    }
  } catch (e) {
    console.error('Edge function call failed:', e)
    const fallbackMessage = buildFallbackMessage(query, unifiedData)
    return {
      message: fallbackMessage,
      confidence_level: 'low',
      products: unifiedData.stock || [],
      should_show_whatsapp_button: true,
    }
  }
}

function buildFallbackMessage(query: string, unifiedData: any) {
  let response = 'Especialista My Way:\n\n'
  const stock = unifiedData.stock || []
  const intel = unifiedData.intel || []
  const nabData = unifiedData.nabData || []

  if (stock.length > 0) {
    response += 'Sim, temos a opção disponível.\n\n'
    stock.forEach((p: any) => {
      response += `**${p.name}**\n`
      const tech = p.technical_info || p.description || 'Especificações sob consulta.'
      response += `\`\`\`\n${tech.substring(0, 150)}...\n\`\`\`\nPreço: USD ${p.price_usd || 'Consulte'}\n\n`
    })
  } else {
    response += 'Não possuo essa informação exata no momento em nosso catálogo.\n\n'
  }

  if (intel.length > 0 || nabData.length > 0) {
    response += 'Detalhes Técnicos / Informações Adicionais:\n\n'
    ;[...intel, ...nabData].forEach((n: any) => {
      response += `**${n.title || 'Informação'}**\n${n.ai_summary || n.raw_content || n.content?.substring(0, 150)}...\n\n`
    })
  }

  response += '\nDisponível para envio imediato de Miami com garantia no Brasil.'

  return response
}

export const generateResponse = generateExpertResponse
export const generateAgentResponse = generateExpertResponse
