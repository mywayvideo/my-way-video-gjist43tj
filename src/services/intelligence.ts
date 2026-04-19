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

export const generateAgentResponse = async (query: string, contextData: any, agentId?: string) => {
  try {
    const systemPrompt = `Você é o Especialista My Way Business.
Sua única fonte de verdade são os 'DADOS DO BANCO' enviados no contexto.
REGRA 1: Se houver produtos na lista, eles ESTÃO em estoque em Miami. Confirme isso imediatamente.
REGRA 2: Se houver notícias na lista, use-as para detalhar a NAB 2026.
REGRA 3: É PROIBIDO dizer que não encontrou algo que esteja na lista de contexto.
REGRA 4: Responda APENAS em Português (PT-BR).
REGRA 5: Mantenha os parágrafos curtos: máximo de 2 frases por parágrafo.
REGRA 6: Use blocos de código (\`\`\`) para formatar especificações técnicas.
REGRA 7: Sempre mencione garantia do fabricante no Brasil/LATAM.`

    const enhancedQuery = `${systemPrompt}\n\nDADOS DO BANCO: ${JSON.stringify(contextData)}\n\nPergunta do usuário: ${query}`

    const { data, error } = await supabase.functions.invoke('process-query', {
      body: {
        query: enhancedQuery,
        products: contextData.products || [],
        intelligence: contextData.news || [],
        agentId,
        isNABQuery: contextData.news?.length > 0,
      },
    })

    if (error) throw error
    if (data?.message) return data.message

    return buildFallbackMessage(query, contextData)
  } catch (e) {
    console.error('Edge function call failed:', e)
    return buildFallbackMessage(query, contextData)
  }
}

function buildFallbackMessage(query: string, contextData: any) {
  let response = 'Especialista My Way:\n\n'
  const products = contextData.products || []
  const news = contextData.news || []

  if (products.length > 0) {
    response +=
      'Encontrei as seguintes opções no nosso catálogo. Confirmo estoque em Miami e garantia do fabricante no Brasil/LATAM:\n\n'
    products.forEach((p: any) => {
      response += `**${p.name}**\n`
      const tech = p.technical_info || p.description || 'Especificações sob consulta.'
      response += `\`\`\`\n${tech.substring(0, 150)}...\n\`\`\`\n\n`
    })
  }

  if (news.length > 0) {
    response += 'Confirmamos diretamente da NAB 2026:\n\n'
    news.forEach((n: any) => {
      response += `**${n.title}**\n${n.ai_summary || n.raw_content?.substring(0, 150)}...\n\n`
    })
  }

  if (products.length === 0 && news.length === 0) {
    response +=
      'Não possuo essa informação exata no momento em nossa base de dados. Recomendo falar com um de nossos especialistas.'
  }

  return response
}
