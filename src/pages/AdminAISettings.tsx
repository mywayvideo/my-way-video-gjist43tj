import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAISettings, AIGlobalSettings } from '@/hooks/use-ai-settings'

export default function AdminAISettings() {
  const { settings, loading, saveSettings } = useAISettings()

  const [localSettings, setLocalSettings] = useState<AIGlobalSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      const restored = { ...settings }
      if (!restored.search_algorithm_sql) {
        restored.search_algorithm_sql =
          "WITH search AS (SELECT $1::text as term) SELECT json_build_object('stock', (SELECT COALESCE(json_agg(p), '[]'::json) FROM (SELECT * FROM products WHERE (name ILIKE '%' || (SELECT term FROM search) || '%' OR model ILIKE '%' || (SELECT term FROM search) || '%') AND status = 'active' LIMIT 12) p), 'intel', (SELECT COALESCE(json_agg(c), '[]'::json) FROM (SELECT * FROM market_intelligence WHERE (raw_content ILIKE '%' || (SELECT term FROM search) || '%') AND status = 'published' LIMIT 5) c), 'nab_data', (SELECT COALESCE(json_agg(n), '[]'::json) FROM (SELECT * FROM nab_market WHERE (title ILIKE '%' || (SELECT term FROM search) || '%' OR content ILIKE '%' || (SELECT term FROM search) || '%') LIMIT 5) n));"
      }
      if (!restored.result_component_config || restored.result_component_config === '{}') {
        restored.result_component_config =
          '{ "displayMode": "grid", "columns": { "mobile": 1, "desktop": 3 }, "showPrice": true }'
      }
      setLocalSettings(restored)
    }
  }, [settings])

  const handleSave = async () => {
    if (!localSettings) return
    if (
      !localSettings.system_prompt_template ||
      localSettings.system_prompt_template.trim() === ''
    ) {
      if (
        !window.confirm(
          'Campos de estratégia não podem ser salvos vazios sem confirmação de ativação do Fallback. Deseja continuar?',
        )
      ) {
        return
      }
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('ai_settings').upsert({
        id: '00000000-0000-0000-0000-000000000001',
        ...localSettings,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      await saveSettings(localSettings)
    } catch (err) {
      console.error('Error saving settings:', err)
    }
    setSaving(false)
  }

  if (loading || !localSettings) {
    return <div className="p-8 text-center text-muted-foreground">Carregando configurações...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da IA</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </div>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">Limites e Lógica</TabsTrigger>
          <TabsTrigger value="prompt">AI Expert Prompt</TabsTrigger>
          <TabsTrigger value="logistics">Regras de Logística</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Limites e Cache</CardTitle>
              <CardDescription>
                Configurações globais de expiração e limites de preço (tabela ai_settings).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expiração do Cache (Dias)</Label>
                <Input
                  type="number"
                  value={localSettings.cache_expiration_days}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      cache_expiration_days: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de Preço para Especialista (USD)</Label>
                <Input
                  type="number"
                  value={localSettings.price_threshold_usd}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      price_threshold_usd: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lógica de Busca (SQL)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="font-mono text-sm min-h-[150px]"
                value={localSettings.search_algorithm_sql}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, search_algorithm_sql: e.target.value })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuração Visual (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="font-mono text-sm min-h-[100px]"
                value={localSettings.result_component_config}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, result_component_config: e.target.value })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Expert Prompt</CardTitle>
              <CardDescription>
                Defina o template de comportamento do especialista (salvo em ai_settings). Responda
                APENAS em Português (PT-BR). Mantenha os parágrafos curtos (máximo 2 sentenças por
                parágrafo).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="text-sm min-h-[300px]"
                value={localSettings.system_prompt_template}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, system_prompt_template: e.target.value })
                }
                placeholder="Você é o Especialista My Way Business. Responda APENAS em Português (PT-BR). Mantenha os parágrafos curtos (máximo 2 sentenças por parágrafo)."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Logística</CardTitle>
              <CardDescription>
                Defina as regras de envio, garantia e origem dos produtos (salvo em ai_settings).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="text-sm min-h-[200px]"
                value={localSettings.logistics_rules_prompt}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, logistics_rules_prompt: e.target.value })
                }
                placeholder="Se price_usd > 0: Envio de Miami com garantia integral no Brasil e América Latina. Origem: Doral, FL."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
