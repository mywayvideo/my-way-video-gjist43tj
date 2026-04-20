import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

export interface AISettings {
  ai_settings_id?: string
  ai_agent_settings_id?: string
  cache_expiration_days: number
  price_threshold_usd: number
  whatsapp_trigger_low_confidence: boolean
  whatsapp_trigger_purchase_keywords: boolean
  whatsapp_trigger_project_keywords: boolean
  whatsapp_trigger_expensive_product: boolean
  system_prompt_template: string
  logistics_rules_prompt: string
  search_algorithm_sql: string
  result_component_config: string
}

let globalSettingsCache: AISettings | null = null
const listeners = new Set<(s: AISettings) => void>()

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings | null>(globalSettingsCache)
  const [loading, setLoading] = useState(!globalSettingsCache)

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

      const merged: AISettings = {
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
        system_prompt_template:
          generalData?.system_prompt_template || agentData?.system_prompt || '',
        logistics_rules_prompt: generalData?.logistics_rules_prompt || '',
        search_algorithm_sql: generalData?.search_algorithm_sql || '',
        result_component_config: generalData?.result_component_config
          ? JSON.stringify(generalData.result_component_config)
          : '',
      }
      globalSettingsCache = merged
      listeners.forEach((l) => l(merged))
      setSettings(merged)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings: AISettings) => {
    try {
      let parsedConfig = {}
      if (newSettings.result_component_config) {
        try {
          parsedConfig = JSON.parse(newSettings.result_component_config)
        } catch (e) {
          toast({
            title: 'Erro de JSON',
            description: 'A configuração do componente de resultado (JSON) é inválida.',
            variant: 'destructive',
          })
          return false
        }
      }

      let aiSettingsId = newSettings.ai_settings_id
      if (!aiSettingsId) {
        const { data: existingAi } = await supabase
          .from('ai_settings')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        aiSettingsId = existingAi?.id || '00000000-0000-0000-0000-000000000001'
      }

      let agentSettingsId = newSettings.ai_agent_settings_id
      if (!agentSettingsId) {
        const { data: existingAgent } = await supabase
          .from('ai_agent_settings')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        agentSettingsId = existingAgent?.id || '00000000-0000-0000-0000-000000000002'
      }

      const generalPayload = {
        id: aiSettingsId,
        cache_expiration_days: newSettings.cache_expiration_days,
        price_threshold_usd: newSettings.price_threshold_usd,
        search_algorithm_sql: newSettings.search_algorithm_sql,
        system_prompt_template: newSettings.system_prompt_template,
        logistics_rules_prompt: newSettings.logistics_rules_prompt,
        result_component_config: parsedConfig,
      }

      const agentPayload = {
        id: agentSettingsId,
        whatsapp_trigger_low_confidence: newSettings.whatsapp_trigger_low_confidence,
        whatsapp_trigger_purchase_keywords: newSettings.whatsapp_trigger_purchase_keywords,
        whatsapp_trigger_project_keywords: newSettings.whatsapp_trigger_project_keywords,
        whatsapp_trigger_expensive_product: newSettings.whatsapp_trigger_expensive_product,
        system_prompt: newSettings.system_prompt_template,
      }

      const { error: aiError } = await supabase
        .from('ai_settings')
        .upsert(generalPayload, { onConflict: 'id' })
      if (aiError) throw aiError

      const { error: agentError } = await supabase
        .from('ai_agent_settings')
        .upsert(agentPayload, { onConflict: 'id' })
      if (agentError) throw agentError

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso no banco de dados!',
      })

      await fetchSettings()
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar. Verifique o banco de dados.',
        variant: 'destructive',
      })
      return false
    }
  }

  useEffect(() => {
    if (!globalSettingsCache) {
      fetchSettings()
    } else {
      setSettings(globalSettingsCache)
    }
    const listener = (s: AISettings) => setSettings(s)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return { settings, loading, fetchSettings, saveSettings }
}
