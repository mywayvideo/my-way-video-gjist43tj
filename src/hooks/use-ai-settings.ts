import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface AIGlobalSettings {
  ai_settings_id?: string
  ai_agent_settings_id?: string
  cache_expiration_days: number
  price_threshold_usd: number
  whatsapp_trigger_low_confidence: boolean
  whatsapp_trigger_purchase_keywords: boolean
  whatsapp_trigger_project_keywords: boolean
  whatsapp_trigger_expensive_product: boolean
  search_algorithm_sql: string
  result_component_config: string
}

export function useAISettings() {
  const [globalSettings, setGlobalSettings] = useState<AIGlobalSettings | null>(null)
  const [systemPromptTemplate, setSystemPromptTemplate] = useState<string>('')
  const [logisticsRulesPrompt, setLogisticsRulesPrompt] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data: agentData } = await supabase
        .from('ai_agent_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      const { data: generalData } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      setGlobalSettings({
        ai_settings_id: generalData?.id,
        ai_agent_settings_id: agentData?.id,
        cache_expiration_days:
          generalData?.cache_expiration_days ?? agentData?.cache_expiration_days ?? 30,
        price_threshold_usd:
          generalData?.price_threshold_usd ?? agentData?.price_threshold_usd ?? 5000,
        whatsapp_trigger_low_confidence: agentData?.whatsapp_trigger_low_confidence ?? true,
        whatsapp_trigger_purchase_keywords: agentData?.whatsapp_trigger_purchase_keywords ?? true,
        whatsapp_trigger_project_keywords: agentData?.whatsapp_trigger_project_keywords ?? true,
        whatsapp_trigger_expensive_product: agentData?.whatsapp_trigger_expensive_product ?? true,
        search_algorithm_sql: generalData?.search_algorithm_sql || '',
        result_component_config: generalData?.result_component_config
          ? JSON.stringify(generalData.result_component_config)
          : '',
      })

      setSystemPromptTemplate(generalData?.system_prompt_template || agentData?.system_prompt || '')
      setLogisticsRulesPrompt(generalData?.logistics_rules_prompt || '')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getOrCreateAiSettingsId = async (currentId?: string) => {
    if (currentId) return currentId
    const { data } = await supabase
      .from('ai_settings')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    return data?.id || '00000000-0000-0000-0000-000000000001'
  }

  const getOrCreateAgentSettingsId = async (currentId?: string) => {
    if (currentId) return currentId
    const { data } = await supabase
      .from('ai_agent_settings')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    return data?.id || '00000000-0000-0000-0000-000000000002'
  }

  const saveGlobalSettings = async (settings: AIGlobalSettings) => {
    try {
      let parsedConfig = {}
      if (settings.result_component_config) {
        try {
          parsedConfig = JSON.parse(settings.result_component_config)
        } catch (e) {
          toast.error('Erro de JSON. A configuração visual é inválida.')
          return false
        }
      }

      const aiSettingsId = await getOrCreateAiSettingsId(settings.ai_settings_id)
      const agentSettingsId = await getOrCreateAgentSettingsId(settings.ai_agent_settings_id)

      await supabase.from('ai_settings').upsert(
        {
          id: aiSettingsId,
          cache_expiration_days: settings.cache_expiration_days,
          price_threshold_usd: settings.price_threshold_usd,
          search_algorithm_sql: settings.search_algorithm_sql,
          result_component_config: parsedConfig,
        },
        { onConflict: 'id' },
      )

      await supabase.from('ai_agent_settings').upsert(
        {
          id: agentSettingsId,
          whatsapp_trigger_low_confidence: settings.whatsapp_trigger_low_confidence,
          whatsapp_trigger_purchase_keywords: settings.whatsapp_trigger_purchase_keywords,
          whatsapp_trigger_project_keywords: settings.whatsapp_trigger_project_keywords,
          whatsapp_trigger_expensive_product: settings.whatsapp_trigger_expensive_product,
        },
        { onConflict: 'id' },
      )

      toast.success('Configurações globais salvas com sucesso!')
      await fetchSettings()
      return true
    } catch (error) {
      toast.error('Erro ao salvar configurações globais.')
      return false
    }
  }

  const saveSystemPrompt = async (prompt: string) => {
    try {
      const aiSettingsId = await getOrCreateAiSettingsId(globalSettings?.ai_settings_id)
      const agentSettingsId = await getOrCreateAgentSettingsId(globalSettings?.ai_agent_settings_id)

      await supabase.from('ai_settings').upsert(
        {
          id: aiSettingsId,
          system_prompt_template: prompt,
        },
        { onConflict: 'id' },
      )

      await supabase.from('ai_agent_settings').upsert(
        {
          id: agentSettingsId,
          system_prompt: prompt,
        },
        { onConflict: 'id' },
      )

      toast.success('Instruções salvas com sucesso!')
      await fetchSettings()
      return true
    } catch (error) {
      toast.error('Erro ao salvar instruções da IA.')
      return false
    }
  }

  const saveLogisticsRules = async (rules: string) => {
    try {
      const aiSettingsId = await getOrCreateAiSettingsId(globalSettings?.ai_settings_id)

      await supabase.from('ai_settings').upsert(
        {
          id: aiSettingsId,
          logistics_rules_prompt: rules,
        },
        { onConflict: 'id' },
      )

      toast.success('Contexto institucional salvo com sucesso!')
      await fetchSettings()
      return true
    } catch (error) {
      toast.error('Erro ao salvar contexto institucional.')
      return false
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    globalSettings,
    systemPromptTemplate,
    logisticsRulesPrompt,
    loading,
    fetchSettings,
    saveGlobalSettings,
    saveSystemPrompt,
    saveLogisticsRules,
  }
}
