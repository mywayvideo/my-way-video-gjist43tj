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
    const systemPrompt = `Você é o Especialista My Way. 
Sua resposta DEVE começar confirmando os itens da lista 'stock'. 
Se 'stock' tem dados, é PROIBIDO dizer que não encontrou. 
Use 'intel' apenas para detalhes técnicos adicionais. 
NUNCA mencione a NAB a menos que o usuário pergunte explicitamente.
Responda SEMPRE em Português (PT-BR).
Mantenha os parágrafos com no máximo 2 frases.
Use blocos de código (\`\`\`) para formatar especificações técnicas.
Você DEVE incluir sempre a frase ao final: "Disponível para envio imediato de Miami com garantia no Brasil."`

    const enhancedQuery = `${systemPrompt}\n\nDADOS DO SISTEMA (VERDADE ABSOLUTA):\n${JSON.stringify(unifiedData)}\n\nPergunta do usuário: ${query}`

    const { data, error } = await supabase.functions.invoke('process-query', {
      body: {
        query: enhancedQuery,
        products: unifiedData.stock || [],
        intelligence: [...(unifiedData.intel || []), ...(unifiedData.web || [])],
        agentId,
        isNABQuery: query.toLowerCase().includes('nab'),
      },
    })

    if (error) throw error
    
    if (data?.message) {
      let finalMessage = data.message;
      if (!finalMessage.includes("Disponível para envio imediato de Miami com garantia no Brasil.")) {
        finalMessage += "\n\nDisponível para envio imediato de Miami com garantia no Brasil.";
      }
      return finalMessage;
    }

    return buildFallbackMessage(query, unifiedData)
  } catch (e) {
    console.error('Edge function call failed:', e)
    return buildFallbackMessage(query, unifiedData)
  }
}

function buildFallbackMessage(query: string, unifiedData: any) {
  let response = 'Especialista My Way:\n\n'
  const stock = unifiedData.stock || []
  const intel = unifiedData.intel || []

  if (stock.length > 0) {
    response += 'Encontrei as seguintes opções no nosso catálogo.\n\n'
    stock.forEach((p: any) => {
      response += `**${p.name}**\n`
      const tech = p.technical_info || p.description || 'Especificações sob consulta.'
      response += `\`\`\`\n${tech.substring(0, 150)}...\n\`\`\`\nPreço: USD ${p.price_usd || 'Consulte'}\n\n`
    })
  } else {
    response += 'Não possuo essa informação exata no momento em nosso catálogo.\n\n'
  }

  if (intel.length > 0) {
    response += 'Detalhes Técnicos / Informações Adicionais:\n\n'
    intel.forEach((n: any) => {
      response += `**${n.title}**\n${n.ai_summary || n.raw_content?.substring(0, 150)}...\n\n`
    })
  }

  response += '\nDisponível para envio imediato de Miami com garantia no Brasil.'

  return response
}

export const generateResponse = generateExpertResponse
export const generateAgentResponse = generateExpertResponse
