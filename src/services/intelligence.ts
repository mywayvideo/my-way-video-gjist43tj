import { supabase } from '@/lib/supabase/client'

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
  products: any[],
  intelligence: any[],
  agentId?: string,
) => {
  try {
    const { data, error } = await supabase.functions.invoke('process-query', {
      body: { query, products, intelligence, agentId },
    })

    if (error) throw error
    if (data?.message) return data.message

    return buildFallbackMessage(query, products, intelligence)
  } catch (e) {
    console.error('Edge function call failed:', e)
    return buildFallbackMessage(query, products, intelligence)
  }
}

function buildFallbackMessage(query: string, products: any[], intelligence: any[]) {
  let response = ''
  const hasNab = intelligence.some(
    (i: any) =>
      i.title?.toLowerCase().includes('nab') ||
      i.raw_content?.toLowerCase().includes('nab') ||
      i.ai_summary?.toLowerCase().includes('nab'),
  )

  if (hasNab) {
    response += 'Confirmamos diretamente da NAB 2026:\n\n'
  }

  if (intelligence.length > 0) {
    response +=
      'Encontramos atualizações importantes na nossa base de conhecimento sobre este assunto. '
    response += 'Essas informações são fresquinhas e podem impactar sua decisão.\n\n'
    intelligence.slice(0, 2).forEach((i: any) => {
      response += `**${i.title}**\n${i.ai_summary || i.raw_content?.substring(0, 150)}...\n\n`
    })
  }

  if (products.length > 0) {
    response += 'Aqui estão as opções disponíveis no nosso catálogo que atendem à sua busca. '
    response +=
      'Esses equipamentos oferecem alta performance e confiabilidade para a sua produção.\n\n'
    products.slice(0, 3).forEach((p: any) => {
      response += `**${p.name}**\n`
      const tech = p.technical_info || p.description || 'Especificações sob consulta.'
      response += `\`\`\`\n${tech.substring(0, 150)}...\n\`\`\`\n\n`
    })
    response +=
      'Recomendação Final: Os produtos acima são excelentes opções baseadas na sua necessidade.'
  }

  if (products.length === 0 && intelligence.length === 0) {
    response =
      'Não possuo essa informação exata no momento em nossa base de dados. Recomendo falar com um de nossos especialistas para analisarmos o seu projeto em detalhes e encontrarmos a solução ideal.'
  }

  return response
}
