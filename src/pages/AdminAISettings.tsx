import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useAISettings, AISettings } from '@/hooks/use-ai-settings'

export default function AdminAISettings() {
  const { toast } = useToast()
  const { settings, loading, fetchSettings } = useAISettings()
  const [saving, setSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState<AISettings | null>(null)

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
    }
  }, [settings])

  const handleSave = async () => {
    if (!localSettings) return
    try {
      setSaving(true)

      let parsedConfig = {}
      try {
        parsedConfig = JSON.parse(localSettings.result_component_config)
      } catch (e) {
        toast({
          title: 'Erro de JSON',
          description: 'A configuração do componente de resultado (JSON) é inválida.',
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      const agentPayload = {
        cache_expiration_days: localSettings.cache_expiration_days,
        price_threshold_usd: localSettings.price_threshold_usd,
        whatsapp_trigger_low_confidence: localSettings.whatsapp_trigger_low_confidence,
        whatsapp_trigger_purchase_keywords: localSettings.whatsapp_trigger_purchase_keywords,
        whatsapp_trigger_project_keywords: localSettings.whatsapp_trigger_project_keywords,
        whatsapp_trigger_expensive_product: localSettings.whatsapp_trigger_expensive_product,
      }

      const generalPayload = {
        cache_expiration_days: localSettings.cache_expiration_days,
        price_threshold_usd: localSettings.price_threshold_usd,
        search_algorithm_sql: localSettings.search_algorithm_sql,
        result_component_config: parsedConfig,
      }

      // Fetch IDs
      const { data: agentData } = await supabase
        .from('ai_agent_settings')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (agentData) {
        await supabase.from('ai_agent_settings').update(agentPayload).eq('id', agentData.id)
      } else {
        await supabase.from('ai_agent_settings').insert([agentPayload])
      }

      const { data: generalData } = await supabase
        .from('ai_settings')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (generalData) {
        await supabase.from('ai_settings').update(generalPayload).eq('id', generalData.id)
      } else {
        await supabase.from('ai_settings').insert([generalPayload])
      }

      await fetchSettings()

      toast({
        title: 'Sucesso',
        description: 'Configurações globais de IA salvas com sucesso!',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
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
              <p className="text-sm text-muted-foreground">
                Exibir quando a IA não tiver certeza da resposta.
              </p>
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
              <Label>Palavras-chave de Compra (Purchase Keywords)</Label>
              <p className="text-sm text-muted-foreground">
                Exibir quando o usuário usar palavras como "comprar", "preço".
              </p>
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
              <Label>Palavras-chave de Projeto (Project Keywords)</Label>
              <p className="text-sm text-muted-foreground">
                Exibir quando mencionado "projeto", "integração", "estúdio".
              </p>
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
              <Label>Produto Caro (Expensive Product)</Label>
              <p className="text-sm text-muted-foreground">
                Exibir quando recomendar produtos acima do limite de preço (Seção B).
              </p>
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
          <CardDescription>
            Insira a lógica SQL para consulta nas tabelas products, market_intelligence e
            nab_market.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="search_sql">Algoritmo de Busca SQL</Label>
            <Textarea
              id="search_sql"
              className="font-mono text-sm min-h-[150px]"
              placeholder="SELECT * FROM products..."
              value={localSettings.search_algorithm_sql}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, search_algorithm_sql: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção F - Configuração de Componentes (Opcional)</CardTitle>
          <CardDescription>
            JSON de configuração adicional para a interface de resultados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="result_config">Configuração de Resultados (JSON)</Label>
            <Textarea
              id="result_config"
              className="font-mono text-sm min-h-[100px]"
              value={localSettings.result_component_config}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, result_component_config: e.target.value })
              }
            />
          </div>
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
