import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface AISettings {
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
        cache_expiration_days:
          agentData?.cache_expiration_days ?? generalData?.cache_expiration_days ?? 30,
        price_threshold_usd:
          agentData?.price_threshold_usd ?? generalData?.price_threshold_usd ?? 5000,
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
          : '{}',
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

  useEffect(() => {
    if (!globalSettingsCache) {
      fetchSettings()
    }
    const listener = (s: AISettings) => setSettings(s)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return { settings, loading, fetchSettings }
}
