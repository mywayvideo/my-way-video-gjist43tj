import { supabase } from '@/lib/supabase/client'

export const searchIntelligence = async (query: string) => {
  const stopWords = new Set([
    'o',
    'a',
    'os',
    'as',
    'de',
    'da',
    'do',
    'dos',
    'das',
    'em',
    'para',
    'quais',
    'na',
    'no',
    'nas',
    'nos',
    'qual',
    'que',
    'e',
    'ou',
    'com',
    'por',
  ])
  const keywords = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))

  if (keywords.length === 0) keywords.push(query.trim())

  const orQuery = keywords
    .map((k) => `title.ilike.%${k}%,raw_content.ilike.%${k}%,ai_summary.ilike.%${k}%`)
    .join(',')

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
    // Context Enrichment
    let enrichedProducts = [...products]
    if (isNABQuery && intelligence && intelligence.length > 0) {
      const miManufacturers = [
        ...new Set(intelligence.map((i) => i.manufacturer_id).filter(Boolean)),
      ]

      const titlesWords = intelligence
        .map((i) => i.title)
        .join(' ')
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 4)

      const topWords = [...new Set(titlesWords)].slice(0, 5)

      let q = supabase
        .schema('public')
        .from('products')
        .select('*, manufacturers(name)')
        .eq('is_discontinued', false)

      if (miManufacturers.length > 0) {
        q = q.in('manufacturer_id', miManufacturers)
      } else if (topWords.length > 0) {
        const orQ = topWords.map((t) => `name.ilike.%${t}%`).join(',')
        q = q.or(orQ)
      }

      const { data: relatedProducts } = await q.limit(5)

      if (relatedProducts && relatedProducts.length > 0) {
        const existingIds = new Set(enrichedProducts.map((p) => p.id))
        relatedProducts.forEach((rp) => {
          if (!existingIds.has(rp.id)) {
            enrichedProducts.push(rp)
          }
        })
      }
    }

    const cleanString = (str: any) =>
      typeof str === 'string' ? str.replace(/[^\w\s\u00C0-\u00FF-]/g, '') : str
    const cleanedProducts = enrichedProducts.map((p) => ({
      ...p,
      name: cleanString(p.name),
      description: cleanString(p.description),
      technical_info: cleanString(p.technical_info),
    }))

    let enhancedQuery = query
    if (cleanedProducts.length > 0) {
      const dbProductsList = cleanedProducts
        .map((p) => `- ${p.name} (Preço: USD ${p.price_usd || 'Consulte'})`)
        .join('\n')
      const systemContextUpdate = `
DADOS DO ESTOQUE ENCONTRADOS:
${dbProductsList}

INSTRUÇÃO IMPORTANTE: Se houver produtos na lista 'DADOS DO ESTOQUE ENCONTRADOS', você DEVE confirmar que eles estão disponíveis em Miami para envio imediato. NUNCA diga que não encontrou um produto se ele estiver nesta lista. ${!isNABQuery ? 'Comece sua resposta com uma confirmação direta do produto.' : ''}
`
      enhancedQuery = `${systemContextUpdate}\n\nPergunta do usuário: ${query}`
    }

    const { data, error } = await supabase.functions.invoke('process-query', {
      body: {
        query: enhancedQuery,
        products: cleanedProducts,
        intelligence: isNABQuery ? intelligence : [],
        agentId,
        isNABQuery,
      },
    })

    if (error) throw error
    if (data?.message) return data.message

    return buildFallbackMessage(query, enrichedProducts, isNABQuery ? intelligence : [], isNABQuery)
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
      response += 'Analisando sua solicitação, encontrei as seguintes opções em nosso catálogo:\n\n'
    } else {
      response += 'Aqui estão as opções disponíveis no nosso catálogo que atendem à sua busca.\n\n'
    }
    products.slice(0, 3).forEach((p: any) => {
      response += `**${p.name}**\n`
      const tech = p.technical_info || p.description || 'Especificações sob consulta.'
      response += `\`\`\`\n${tech.substring(0, 150)}...\n\`\`\`\n\n`
    })
    response +=
      'Recomendação Final: Os produtos acima são excelentes opções baseadas na sua necessidade.'
  }

  if (products.length === 0 && (!isNABQuery || intelligence.length === 0)) {
    response =
      'Não possuo essa informação exata no momento em nossa base de dados. Recomendo falar com um de nossos especialistas para analisarmos o seu projeto em detalhes e encontrarmos a solução ideal.'
  }

  return response
}
