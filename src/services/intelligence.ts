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

  const { data: settings } = await supabase
    .from('ai_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const { data: agentSettings } = await supabase
    .from('ai_agent_settings')
    .select('*')
    .order('created_at', { ascending: true })
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
  // Read settings directly to synchronize authority
  const settings = await getAISettings()

  const systemPromptTemplate = settings.system_prompt_template || ''
  const logisticsRulesPrompt = settings.logistics_rules_prompt || ''

  const contextIntelligence = [...(unifiedData.intel || []), ...(unifiedData.web || [])]
  const nabData = unifiedData.nabData || []
  const hasNab = nabData.length > 0

  const contextProducts = unifiedData.products || unifiedData.stock || []

  const currentContext = JSON.stringify({
    products: contextProducts,
    intelligence: [...contextIntelligence, ...nabData],
  })

  const assembledPrompt = `${systemPromptTemplate}\n\n${logisticsRulesPrompt}\n\n${currentContext}`

  let data: any = null
  try {
    const res = await supabase.functions.invoke('process-query', {
      body: {
        query: query,
        products: contextProducts,
        intelligence: [...contextIntelligence, ...nabData],
        agentId: agentId,
        isNABQuery: hasNab,
        assembledPrompt: assembledPrompt,
      },
    })

    if (res.error) throw res.error
    data = res.data
  } catch (err) {
    console.error('Error invoking process-query:', err)
    return {
      content:
        'Neste momento nossos sistemas de inteligência estão indisponíveis. Por favor, tente novamente mais tarde.',
      products: contextProducts,
      should_show_whatsapp_button: true,
      confidence_level: 'low',
    }
  }

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
      content: result.content || result.message || 'Consulta processada com sucesso.',
      products:
        Array.isArray(result.products) && result.products.length > 0
          ? result.products
          : contextProducts,
      should_show_whatsapp_button: result.should_show_whatsapp_button || false,
      confidence_level: result.confidence_level || 'high',
    }
  } catch (err) {
    return {
      content:
        typeof data?.message === 'string' ? data.message : 'Consulta processada com sucesso.',
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
