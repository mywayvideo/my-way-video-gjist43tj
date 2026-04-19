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

export const generateAgentResponse = async (
  query: string,
  unifiedContext: any,
  agentId?: string,
) => {
  try {
    const systemPrompt = `Você é o Especialista My Way Business.
Sua única fonte de verdade são os 'DADOS DO BANCO' enviados no contexto.
PRIORIDADE 1: Se o produto está em 'products', confirme estoque imediato em Miami.
PRIORIDADE 2: Se a info está em 'market_intelligence', use-a para detalhes técnicos/NAB.
PRIORIDADE 3: Se veio da Web, apresente como 'Informação de Mercado' e salve no cache.
PROIBIÇÃO: Nunca diga 'não encontrei' se houver qualquer dado no contexto enviado.
REGRA 4: Responda APENAS em Português (PT-BR).
REGRA 5: Mantenha os parágrafos curtos: máximo de 2 frases por parágrafo.
REGRA 6: Use blocos de código (\`\`\`) para formatar especificações técnicas.
REGRA 7: Sempre mencione garantia do fabricante no Brasil/LATAM e preços em USD.`

    const enhancedQuery = `${systemPrompt}\n\nDADOS DO BANCO: ${JSON.stringify(unifiedContext)}\n\nPergunta do usuário: ${query}`

    const { data, error } = await supabase.functions.invoke('process-query', {
      body: {
        query: enhancedQuery,
        products: unifiedContext.products || [],
        intelligence: [...(unifiedContext.news || []), ...(unifiedContext.web || [])],
        agentId,
        isNABQuery: unifiedContext.news?.length > 0 || unifiedContext.web?.length > 0,
      },
    })

    if (error) throw error
    if (data?.message) return data.message

    return buildFallbackMessage(query, unifiedContext)
  } catch (e) {
    console.error('Edge function call failed:', e)
    return buildFallbackMessage(query, unifiedContext)
  }
}

function buildFallbackMessage(query: string, unifiedContext: any) {
  let response = 'Especialista My Way:\n\n'
  const products = unifiedContext.products || []
  const news = unifiedContext.news || []
  const web = unifiedContext.web || []

  if (products.length > 0) {
    response +=
      'Encontrei as seguintes opções no nosso catálogo. Confirmo estoque imediato em Miami, garantia do fabricante no Brasil/LATAM e preços em USD:\n\n'
    products.forEach((p: any) => {
      response += `**${p.name}**\n`
      const tech = p.technical_info || p.description || 'Especificações sob consulta.'
      response += `\`\`\`\n${tech.substring(0, 150)}...\n\`\`\`\nPreço: USD ${p.price_usd || 'Consulte'}\n\n`
    })
  }

  if (news.length > 0) {
    response += 'Detalhes Técnicos / Informações:\n\n'
    news.forEach((n: any) => {
      response += `**${n.title}**\n${n.ai_summary || n.raw_content?.substring(0, 150)}...\n\n`
    })
  }

  if (web.length > 0) {
    response += 'Informação de Mercado (Web):\n\n'
    web.forEach((w: any) => {
      response += `**${w.title}**\n${w.raw_content?.substring(0, 200)}...\n\n`
    })
  }

  if (products.length === 0 && news.length === 0 && web.length === 0) {
    response +=
      'Não possuo essa informação exata no momento em nossa base de dados. Recomendo falar com um de nossos especialistas.'
  }

  return response
}
