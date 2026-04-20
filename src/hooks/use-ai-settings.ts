import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface AIGlobalSettings {
  id?: string
  cache_expiration_days: number
  price_threshold_usd: number
  search_algorithm_sql: string
  result_component_config: string
  system_prompt_template: string
  logistics_rules_prompt: string
}

export function useAISettings() {
  const [settings, setSettings] = useState<AIGlobalSettings | null>(null)
  const [agentSystemPrompt, setAgentSystemPrompt] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      setLoading(true)

      const [settingsRes, agentSettingsRes] = await Promise.all([
        supabase
          .from('ai_settings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('ai_agent_settings')
          .select('id, system_prompt')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

      const { data } = settingsRes

      if (data) {
        setSettings({
          id: data.id,
          cache_expiration_days: data.cache_expiration_days ?? 30,
          price_threshold_usd: data.price_threshold_usd ?? 5000,
          search_algorithm_sql: data.search_algorithm_sql || '',
          result_component_config: data.result_component_config
            ? JSON.stringify(data.result_component_config)
            : '',
          system_prompt_template: data.system_prompt_template || '',
          logistics_rules_prompt: data.logistics_rules_prompt || '',
        })
      } else {
        setSettings({
          cache_expiration_days: 30,
          price_threshold_usd: 5000,
          search_algorithm_sql: '',
          result_component_config: '{}',
          system_prompt_template: '',
          logistics_rules_prompt: '',
        })
      }

      if (agentSettingsRes.data) {
        setAgentSystemPrompt(agentSettingsRes.data.system_prompt || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings: AIGlobalSettings) => {
    try {
      let parsedConfig = {}
      if (newSettings.result_component_config) {
        try {
          parsedConfig = JSON.parse(newSettings.result_component_config)
        } catch (e) {
          toast.error('Erro de JSON. A configuração visual é inválida.')
          return false
        }
      }

      let aiSettingsId = newSettings.id
      if (!aiSettingsId) {
        const { data } = await supabase
          .from('ai_settings')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        aiSettingsId = data?.id || '00000000-0000-0000-0000-000000000001'
      }

      await supabase.from('ai_settings').upsert(
        {
          id: aiSettingsId,
          cache_expiration_days: newSettings.cache_expiration_days,
          price_threshold_usd: newSettings.price_threshold_usd,
          search_algorithm_sql: newSettings.search_algorithm_sql,
          result_component_config: parsedConfig,
          system_prompt_template: newSettings.system_prompt_template,
          logistics_rules_prompt: newSettings.logistics_rules_prompt,
        },
        { onConflict: 'id' },
      )

      toast.success('Configurações da IA salvas com sucesso!')
      await fetchSettings()
      return true
    } catch (error) {
      toast.error('Erro ao salvar configurações da IA.')
      return false
    }
  }

  const saveAgentSystemPrompt = async (prompt: string) => {
    try {
      const { data } = await supabase
        .from('ai_agent_settings')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (data?.id) {
        const { error } = await supabase
          .from('ai_agent_settings')
          .update({ system_prompt: prompt, updated_at: new Date().toISOString() })
          .eq('id', data.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ai_agent_settings').insert({
          system_prompt: prompt,
          id: '00000000-0000-0000-0000-000000000001',
        })
        if (error) throw error
      }

      setAgentSystemPrompt(prompt)
      toast.success('Instruções da IA salvas com sucesso!')
      return true
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar instruções. Tente novamente.')
      return false
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    settings,
    agentSystemPrompt,
    loading,
    fetchSettings,
    saveSettings,
    saveAgentSystemPrompt,
  }
}
