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

export default function AdminAISettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState({
    cache_expiration_days: 30,
    price_threshold_usd: 5000,
    whatsapp_trigger_low_confidence: true,
    whatsapp_trigger_purchase_keywords: true,
    whatsapp_trigger_project_keywords: true,
    whatsapp_trigger_expensive_product: true,
    search_algorithm_sql: '',
    system_prompt_template: '',
    result_component_config: '{}',
  })

  const [agentId, setAgentId] = useState<string | null>(null)
  const [settingsId, setSettingsId] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)

      const { data: agentData, error: agentError } = await supabase
        .from('ai_agent_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      const { data: generalData, error: generalError } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (agentData) setAgentId(agentData.id)
      if (generalData) setSettingsId(generalData.id)

      setSettings({
        cache_expiration_days:
          agentData?.cache_expiration_days ?? generalData?.cache_expiration_days ?? 30,
        price_threshold_usd:
          agentData?.price_threshold_usd ?? generalData?.price_threshold_usd ?? 5000,
        whatsapp_trigger_low_confidence: agentData?.whatsapp_trigger_low_confidence ?? true,
        whatsapp_trigger_purchase_keywords: agentData?.whatsapp_trigger_purchase_keywords ?? true,
        whatsapp_trigger_project_keywords: agentData?.whatsapp_trigger_project_keywords ?? true,
        whatsapp_trigger_expensive_product: agentData?.whatsapp_trigger_expensive_product ?? true,
        search_algorithm_sql: generalData?.search_algorithm_sql || '',
        system_prompt_template:
          generalData?.system_prompt_template || agentData?.system_prompt || '',
        result_component_config: generalData?.result_component_config
          ? JSON.stringify(generalData.result_component_config, null, 2)
          : '{}',
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      let parsedConfig = {}
      try {
        parsedConfig = JSON.parse(settings.result_component_config)
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
        cache_expiration_days: settings.cache_expiration_days,
        price_threshold_usd: settings.price_threshold_usd,
        whatsapp_trigger_low_confidence: settings.whatsapp_trigger_low_confidence,
        whatsapp_trigger_purchase_keywords: settings.whatsapp_trigger_purchase_keywords,
        whatsapp_trigger_project_keywords: settings.whatsapp_trigger_project_keywords,
        whatsapp_trigger_expensive_product: settings.whatsapp_trigger_expensive_product,
        system_prompt: settings.system_prompt_template,
      }

      if (agentId) {
        await supabase.from('ai_agent_settings').update(agentPayload).eq('id', agentId)
      } else {
        await supabase.from('ai_agent_settings').insert([agentPayload])
      }

      const generalPayload = {
        cache_expiration_days: settings.cache_expiration_days,
        price_threshold_usd: settings.price_threshold_usd,
        search_algorithm_sql: settings.search_algorithm_sql,
        system_prompt_template: settings.system_prompt_template,
        result_component_config: parsedConfig,
      }

      if (settingsId) {
        await supabase.from('ai_settings').update(generalPayload).eq('id', settingsId)
      } else {
        await supabase.from('ai_settings').insert([generalPayload])
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações de lógica e gatilhos salvas com sucesso!',
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

  if (loading) {
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
              value={settings.cache_expiration_days}
              onChange={(e) =>
                setSettings({ ...settings, cache_expiration_days: parseInt(e.target.value) || 0 })
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
              value={settings.price_threshold_usd}
              onChange={(e) =>
                setSettings({ ...settings, price_threshold_usd: parseFloat(e.target.value) || 0 })
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
              checked={settings.whatsapp_trigger_low_confidence}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, whatsapp_trigger_low_confidence: checked })
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
              checked={settings.whatsapp_trigger_purchase_keywords}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, whatsapp_trigger_purchase_keywords: checked })
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
              checked={settings.whatsapp_trigger_project_keywords}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, whatsapp_trigger_project_keywords: checked })
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
              checked={settings.whatsapp_trigger_expensive_product}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, whatsapp_trigger_expensive_product: checked })
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
              value={settings.search_algorithm_sql}
              onChange={(e) => setSettings({ ...settings, search_algorithm_sql: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção E - Template do Prompt do Especialista</CardTitle>
          <CardDescription>
            Defina a identidade, tom de voz e regras de soberania de dados da IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="system_prompt">Template do Prompt do Especialista</Label>
            <Textarea
              id="system_prompt"
              className="min-h-[300px]"
              rows={15}
              placeholder="Você é um Consultor Sênior..."
              value={settings.system_prompt_template}
              onChange={(e) => setSettings({ ...settings, system_prompt_template: e.target.value })}
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
              value={settings.result_component_config}
              onChange={(e) =>
                setSettings({ ...settings, result_component_config: e.target.value })
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
