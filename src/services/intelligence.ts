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

export const generateAgentResponse = async (
  query: string,
  products: any[],
  intelligence: any[],
) => {
  const systemPrompt =
    'Você é o Agente My Way Business, especialista em audiovisual. Use os dados fornecidos para responder. Se os dados forem da NAB 2026, use o selo de cobertura ao vivo. Mantenha parágrafos curtos (2-3 frases), use blocos de código (```) para especificações. Responda em PT-BR.'

  const dataContext = `
PRODUTOS ENCONTRADOS:
${JSON.stringify(products.map((p) => ({ nome: p.name, desc: p.description, tech: p.technical_info })))}

INTELIGÊNCIA DE MERCADO (NAB 2026 etc):
${JSON.stringify(intelligence.map((i) => ({ titulo: i.title, resumo: i.ai_summary, conteudo: i.raw_content })))}
  `

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Contexto:\n${dataContext}\n\nPergunta do usuário: ${query}` },
          ],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.choices && data.choices[0]) {
          return data.choices[0].message.content
        }
      }
    } catch (e) {
      console.error('OpenAI direct call failed', e)
    }
  }

  // Fallback conversacional simulado
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
