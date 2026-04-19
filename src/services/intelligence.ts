import { supabase } from '@/lib/supabase/client'

export const searchIntelligence = async (query: string) => {
  const keywords = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  if (keywords.length === 0) keywords.push(query.trim())

  const exactMatch = `title.ilike.%${query.trim()}%,raw_content.ilike.%${query.trim()}%,ai_summary.ilike.%${query.trim()}%`
  const termsMatch = keywords
    .map((k) => `title.ilike.%${k}%,raw_content.ilike.%${k}%,ai_summary.ilike.%${k}%`)
    .join(',')

  const orQuery = keywords.length > 1 ? `${exactMatch},${termsMatch}` : exactMatch

  try {
    const { data, error } = await supabase
      .schema('public')
      .from('market_intelligence')
      .select('*')
      .eq('status', 'published')
      .or(orQuery)
      .limit(3)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error in searchIntelligence:', error)
    return []
  }
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
  products: any[],
  intelligence: any[],
  agentId?: string,
  isNABQuery: boolean = false,
) => {
  try {
    const stringifiedProducts = JSON.stringify(products)
    const systemContextUpdate = `
IDENTIDADE: Você é um Vendedor Senior.
PRODUTOS ENCONTRADOS NO SEU ESTOQUE: ${stringifiedProducts}
ESTOQUE ATUAL: ${stringifiedProducts}
DADOS REAIS DO BANCO: ${stringifiedProducts}

REGRAS OBRIGATÓRIAS:
1. Responda APENAS em Português (PT-BR).
2. Parágrafos curtos: máximo de 2 frases por parágrafo.
3. Se o modelo solicitado (ex: FX30) estiver na lista acima, você DEVE confirmar a disponibilidade em Miami. É terminantemente PROIBIDO dizer que não encontrou o produto se ele estiver no contexto enviado. Se houver produtos em 'DADOS REAIS DO BANCO', você DEVE confirmar estoque em Miami.
4. Sempre mencione: "Disponível para envio imediato de Miami com garantia no Brasil."
5. Use blocos de código (\`\`\`) para formatar especificações técnicas.
6. Nunca mencione IDs de produtos. Use os preços em USD informados.
7. Use o selo NAB 2026 apenas se a informação vier especificamente da tabela market_intelligence.
`
    const enhancedQuery = `${systemContextUpdate}\n\nPergunta do usuário: ${query}`

    const { data, error } = await supabase.functions.invoke('process-query', {
      body: {
        query: enhancedQuery,
        products: products,
        intelligence: isNABQuery ? intelligence : [],
        agentId,
        isNABQuery,
      },
    })

    if (error) throw error
    if (data?.message) return data.message

    return buildFallbackMessage(query, products, isNABQuery ? intelligence : [], isNABQuery)
  } catch (e) {
    console.error('Edge function call failed:', e)
    return buildFallbackMessage(query, products, isNABQuery ? intelligence : [], isNABQuery)
  }
}

function buildFallbackMessage(
  query: string,
  products: any[],
  intelligence: any[],
  isNABQuery: boolean,
) {
  let response = ''

  if (isNABQuery) {
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
  } else {
    response += 'Consultor My Way: '
  }

  if (products.length > 0) {
    if (!isNABQuery) {
      response +=
        'Analisando sua solicitação, encontrei as seguintes opções em nosso catálogo e confirmo estoque em Miami:\n\n'
    } else {
      response +=
        'Aqui estão as opções disponíveis no nosso catálogo que atendem à sua busca e confirmo estoque em Miami:\n\n'
    }
    products.forEach((p: any) => {
      response += `**${p.name}**\n`
      const tech = p.technical_info || p.description || 'Especificações sob consulta.'
      response += `\`\`\`\n${tech.substring(0, 150)}...\n\`\`\`\n\n`
    })
  }

  if (products.length === 0 && (!isNABQuery || intelligence.length === 0)) {
    response =
      'Não possuo essa informação exata no momento em nossa base de dados. Recomendo falar com um de nossos especialistas.'
  }

  return response
}
