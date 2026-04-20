import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useAISettings, AISettings } from '@/hooks/use-ai-settings'

export default function AdminAISettings() {
  const { settings, loading, saveSettings } = useAISettings()
  const [saving, setSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState<AISettings | null>(null)

  useEffect(() => {
    if (settings) {
      const restoredSettings = { ...settings }

      if (!restoredSettings.search_algorithm_sql) {
        restoredSettings.search_algorithm_sql =
          "SELECT * FROM products WHERE (name ILIKE '%' || $1 || '%' OR model ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%') AND status = 'active' LIMIT 12"
      }
      if (!restoredSettings.system_prompt_template) {
        restoredSettings.system_prompt_template =
          'Você é o Especialista My Way Business, autoridade em audiovisual profissional. Use os dados de estoque como prioridade. Sempre mencione o envio de Miami e a garantia no Brasil/LATAM.'
      }
      if (
        !restoredSettings.result_component_config ||
        restoredSettings.result_component_config === '{}'
      ) {
        restoredSettings.result_component_config =
          '{ "displayMode": "grid", "columns": { "mobile": 1, "desktop": 3 } }'
      }
      if (!restoredSettings.logistics_rules_prompt) {
        restoredSettings.logistics_rules_prompt =
          'Se price_usd > 0: Miami e Brasil. Garantia integral Brasil e América Latina.'
      }

      setLocalSettings(restoredSettings)
    }
  }, [settings])

  const handleSave = async () => {
    if (!localSettings) return
    setSaving(true)
    await saveSettings(localSettings)
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
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seção A - Cache e Desempenho</CardTitle>
          <CardDescription>Configurações de expiração do cache de produtos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="cache_days">Expiração do Cache (Dias)</Label>
            <Input
              id="cache_days"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção B - Gatilhos de Preço</CardTitle>
          <CardDescription>Valor limite para ativar assistência humana.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="price_threshold">Limite de Preço (USD)</Label>
            <Input
              id="price_threshold"
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
          <CardTitle>Seção C - Gatilhos do Botão WhatsApp</CardTitle>
          <CardDescription>
            Condições para exibir o botão de contato com especialista.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Baixa Confiança (Low Confidence)</Label>
            </div>
            <Switch
              checked={localSettings.whatsapp_trigger_low_confidence}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, whatsapp_trigger_low_confidence: checked })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Palavras-chave de Compra</Label>
            </div>
            <Switch
              checked={localSettings.whatsapp_trigger_purchase_keywords}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, whatsapp_trigger_purchase_keywords: checked })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Palavras-chave de Projeto</Label>
            </div>
            <Switch
              checked={localSettings.whatsapp_trigger_project_keywords}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, whatsapp_trigger_project_keywords: checked })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Produto Caro (Acima do limite)</Label>
            </div>
            <Switch
              checked={localSettings.whatsapp_trigger_expensive_product}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, whatsapp_trigger_expensive_product: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção D - Lógica de Busca (SQL)</CardTitle>
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
          <CardTitle>Seção E - Prompt do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="text-sm min-h-[100px]"
            value={localSettings.system_prompt_template}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, system_prompt_template: e.target.value })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção F - Configuração Visual (JSON)</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Seção G - Regras de Logística</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="text-sm min-h-[100px]"
            value={localSettings.logistics_rules_prompt}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, logistics_rules_prompt: e.target.value })
            }
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 pb-12">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  )
}
