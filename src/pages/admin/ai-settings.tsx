import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'

export default function AdminAISettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    id: '',
    cache_expiration_days: 30,
    price_threshold_usd: 5000,
    ignore_stock_count: true,
    logistics_rules_prompt: '',
    search_algorithm_sql: '',
    system_prompt_template: '',
    agent_id: '',
    whatsapp_trigger_low_confidence: true,
    whatsapp_trigger_purchase_keywords: true,
    whatsapp_trigger_project_keywords: true,
    whatsapp_trigger_expensive_product: true,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const [aiSettingsRes, aiAgentSettingsRes] = await Promise.all([
        supabase.from('ai_settings').select('*').limit(1).maybeSingle(),
        supabase.from('ai_agent_settings').select('*').limit(1).maybeSingle(),
      ])

      if (aiSettingsRes.error) throw aiSettingsRes.error
      if (aiAgentSettingsRes.error) throw aiAgentSettingsRes.error

      const data = aiSettingsRes.data
      const agentData = aiAgentSettingsRes.data

      setSettings({
        id: data?.id || '',
        cache_expiration_days: data?.cache_expiration_days ?? 30,
        price_threshold_usd: data?.price_threshold_usd ?? 5000,
        ignore_stock_count: data?.ignore_stock_count ?? true,
        logistics_rules_prompt: data?.logistics_rules_prompt || '',
        search_algorithm_sql: data?.search_algorithm_sql || '',
        system_prompt_template: data?.system_prompt_template || '',
        agent_id: agentData?.id || '',
        whatsapp_trigger_low_confidence: agentData?.whatsapp_trigger_low_confidence ?? true,
        whatsapp_trigger_purchase_keywords: agentData?.whatsapp_trigger_purchase_keywords ?? true,
        whatsapp_trigger_project_keywords: agentData?.whatsapp_trigger_project_keywords ?? true,
        whatsapp_trigger_expensive_product: agentData?.whatsapp_trigger_expensive_product ?? true,
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações do Admin.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const aiSettingsData = {
        cache_expiration_days: settings.cache_expiration_days,
        price_threshold_usd: settings.price_threshold_usd,
        ignore_stock_count: settings.ignore_stock_count,
        logistics_rules_prompt: settings.logistics_rules_prompt,
        search_algorithm_sql: settings.search_algorithm_sql,
        system_prompt_template: settings.system_prompt_template,
        updated_at: new Date().toISOString(),
      }

      const agentSettingsData = {
        whatsapp_trigger_low_confidence: settings.whatsapp_trigger_low_confidence,
        whatsapp_trigger_purchase_keywords: settings.whatsapp_trigger_purchase_keywords,
        whatsapp_trigger_project_keywords: settings.whatsapp_trigger_project_keywords,
        whatsapp_trigger_expensive_product: settings.whatsapp_trigger_expensive_product,
        updated_at: new Date().toISOString(),
      }

      if (settings.id) {
        const { error } = await supabase
          .from('ai_settings')
          .update(aiSettingsData)
          .eq('id', settings.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ai_settings').insert(aiSettingsData)
        if (error) throw error
      }

      if (settings.agent_id) {
        const { error } = await supabase
          .from('ai_agent_settings')
          .update(agentSettingsData)
          .eq('id', settings.agent_id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ai_agent_settings').insert(agentSettingsData)
        if (error) throw error
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações de inteligência salvas com sucesso!',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações de IA</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as regras de busca e comportamento do agente de IA.
          </p>
        </div>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Section A - Configurações de Cache</CardTitle>
            <CardDescription>Defina o tempo de expiração do cache de produtos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="cache_expiration">Dias de Expiração do Cache</Label>
              <Input
                id="cache_expiration"
                type="number"
                value={settings.cache_expiration_days}
                onChange={(e) => handleChange('cache_expiration_days', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section B - Limite de Preço</CardTitle>
            <CardDescription>
              Valor em USD para classificar um produto como caro e exibir gatilhos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="price_threshold">Limite de Preço (USD)</Label>
              <Input
                id="price_threshold"
                type="number"
                value={settings.price_threshold_usd}
                onChange={(e) => handleChange('price_threshold_usd', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section C - Gatilhos do WhatsApp</CardTitle>
            <CardDescription>
              Configurações para exibir o botão de contato com especialista.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Confidence Trigger</Label>
                <div className="text-sm text-muted-foreground">
                  Ativa botão se a IA tiver dúvida
                </div>
              </div>
              <Switch
                checked={settings.whatsapp_trigger_low_confidence}
                onCheckedChange={(checked) =>
                  handleChange('whatsapp_trigger_low_confidence', checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Purchase Keywords Trigger</Label>
                <div className="text-sm text-muted-foreground">
                  Ativa botão se detectar intenção de compra
                </div>
              </div>
              <Switch
                checked={settings.whatsapp_trigger_purchase_keywords}
                onCheckedChange={(checked) =>
                  handleChange('whatsapp_trigger_purchase_keywords', checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Project Keywords Trigger</Label>
                <div className="text-sm text-muted-foreground">
                  Ativa botão para solicitações de projeto
                </div>
              </div>
              <Switch
                checked={settings.whatsapp_trigger_project_keywords}
                onCheckedChange={(checked) =>
                  handleChange('whatsapp_trigger_project_keywords', checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Expensive Product Trigger</Label>
                <div className="text-sm text-muted-foreground">
                  Ativa botão para produtos acima do limite
                </div>
              </div>
              <Switch
                checked={settings.whatsapp_trigger_expensive_product}
                onCheckedChange={(checked) =>
                  handleChange('whatsapp_trigger_expensive_product', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section D - Search Logic (SQL)</CardTitle>
            <CardDescription>
              Insira a query SQL que define como o sistema busca em Products, Cache e NAB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="search_sql">Algoritmo de Busca SQL</Label>
              <Textarea
                id="search_sql"
                className="min-h-[200px] font-mono text-sm"
                value={settings.search_algorithm_sql}
                onChange={(e) => handleChange('search_algorithm_sql', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section E - AI Expert Prompt</CardTitle>
            <CardDescription>
              Defina a identidade, tom de voz e regras de soberania de dados da IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="system_prompt">Template do Prompt do Especialista</Label>
              <Textarea
                id="system_prompt"
                className="min-h-[350px] font-mono text-sm"
                rows={15}
                value={settings.system_prompt_template}
                onChange={(e) => handleChange('system_prompt_template', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section F - Regras de Estoque e Logística</CardTitle>
            <CardDescription>
              Defina se a IA deve ignorar o estoque zero e como decidir entre Miami/Brasil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ignorar Quantidade em Estoque</Label>
                <div className="text-sm text-muted-foreground">
                  Permitir recomendações de produtos sem estoque ativo.
                </div>
              </div>
              <Switch
                checked={settings.ignore_stock_count}
                onCheckedChange={(checked) => handleChange('ignore_stock_count', checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="logistics_prompt">Regras de Entrega e Origem</Label>
              <Textarea
                id="logistics_prompt"
                className="min-h-[100px]"
                value={settings.logistics_rules_prompt}
                onChange={(e) => handleChange('logistics_rules_prompt', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-6 pb-12">
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
