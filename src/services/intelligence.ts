import { supabase } from '@/lib/supabase/client'

export async function getAISettings() {
  const cacheKey = 'myway_ai_settings_cache'
  const cachedStr = sessionStorage.getItem(cacheKey)

  if (cachedStr) {
    try {
      const parsed = JSON.parse(cachedStr)
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.data
      }
    } catch (e) {
      // Ignore cache parse error and fetch fresh settings
    }
  }

  const { data: settings } = await supabase.from('ai_settings').select('*').limit(1).maybeSingle()

  const { data: agentSettings } = await supabase
    .from('ai_agent_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const finalSettings = { ...agentSettings, ...settings }

  sessionStorage.setItem(
    cacheKey,
    JSON.stringify({
      timestamp: Date.now(),
      data: finalSettings,
    }),
  )

  return finalSettings
}

export async function getActiveAgent() {
  const { data } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data
}

export async function generateResponse(query: string, unifiedData: any = {}, agentId?: string) {
  const settings = await getAISettings()

  const baseInstruction = settings?.system_prompt_template
    ? settings.system_prompt_template
    : 'Você é um especialista em audiovisual.'

  const triggersContext = `
Contexto de Gatilhos e Regras:
- Limite de Preço para Gatilho: USD ${settings?.price_threshold_usd || 5000}
- Acionar em Baixa Confiança: ${settings?.whatsapp_trigger_low_confidence ? 'Sim' : 'Não'}
- Acionar em Palavras de Compra: ${settings?.whatsapp_trigger_purchase_keywords ? 'Sim' : 'Não'}
- Acionar em Palavras de Projeto: ${settings?.whatsapp_trigger_project_keywords ? 'Sim' : 'Não'}
`

  const systemInstruction = `${baseInstruction}

${triggersContext}

Sua resposta deve ser um JSON válido. O campo 'content' deve conter o texto formatado em Markdown. O campo 'products' deve conter a lista de objetos de produtos encontrados no banco.

REGRAS OBRIGATÓRIAS:
- A resposta DEVE ser em Português (PT-BR).
- Os parágrafos devem ter no máximo 2 sentenças.
- Sempre inclua no final: "Disponível para envio imediato de Miami com garantia no Brasil."`

  const contextProducts = unifiedData.products || unifiedData.stock || []
  const contextIntelligence = unifiedData.intel || unifiedData.nabData || []

  const { data, error } = await supabase.functions.invoke('process-query', {
    body: {
      query: `${systemInstruction}\n\nConsulta do Usuário: ${query}`,
      products: contextProducts,
      intelligence: contextIntelligence,
      agentId: agentId,
    },
  })

  if (error) throw error

  try {
    let result = data.message || data
    if (typeof result === 'string') {
      const start = result.indexOf('{')
      const end = result.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        result = JSON.parse(result.substring(start, end + 1))
      } else {
        result = JSON.parse(result)
      }
    }

    return {
      content:
        result.content ||
        result.message ||
        'Aqui estão os equipamentos localizados. Disponível para envio imediato de Miami com garantia no Brasil.',
      products: Array.isArray(result.products) ? result.products : contextProducts,
      should_show_whatsapp_button: result.should_show_whatsapp_button || false,
      confidence_level: result.confidence_level || 'high',
    }
  } catch (err) {
    return {
      content:
        typeof data.message === 'string'
          ? data.message
          : 'Aqui estão os equipamentos localizados. Disponível para envio imediato de Miami com garantia no Brasil.',
      products: contextProducts,
      should_show_whatsapp_button: false,
      confidence_level: 'high',
    }
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
