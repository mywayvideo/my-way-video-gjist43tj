import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminAISettings() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState({
    system_prompt_template: '',
    search_algorithm_sql: '',
    logistics_rules_prompt: '',
    ignore_stock_count: true,
    price_threshold_usd: 5000,
    cache_expiration_days: 30,
    result_component_config: { columns_desktop: 4, columns_mobile: 2 },
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle()

    if (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações.',
        variant: 'destructive',
      })
      return
    }

    if (data) {
      setSettings({
        system_prompt_template: data.system_prompt_template || '',
        search_algorithm_sql: data.search_algorithm_sql || '',
        logistics_rules_prompt: data.logistics_rules_prompt || '',
        ignore_stock_count: data.ignore_stock_count ?? true,
        price_threshold_usd: data.price_threshold_usd ?? 5000,
        cache_expiration_days: data.cache_expiration_days ?? 30,
        result_component_config: (data.result_component_config as any) || {
          columns_desktop: 4,
          columns_mobile: 2,
        },
      })
    }
  }

  const handleSave = async () => {
    if (!settings.system_prompt_template.trim() || !settings.search_algorithm_sql.trim()) {
      const confirmFallback = window.confirm(
        'Campos de estratégia não podem ser salvos vazios sem confirmação de ativação do Fallback. Deseja ativar o Fallback genérico?',
      )
      if (!confirmFallback) return
    }

    setIsLoading(true)
    const { error } = await supabase.from('ai_settings').upsert({
      id: '00000000-0000-0000-0000-000000000001',
      ...settings,
      updated_at: new Date().toISOString(),
    })

    setIsLoading(false)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações de IA salvas com sucesso.' })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Inteligência Artificial</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie o comportamento, estratégia e regras logísticas da IA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt de Sistema (System Instructions)</CardTitle>
          <CardDescription>
            Instruções primárias que governam o comportamento e a persona da IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[150px] font-mono text-sm"
            value={settings.system_prompt_template}
            onChange={(e) => setSettings({ ...settings, system_prompt_template: e.target.value })}
            placeholder="Você é o Especialista My Way Business..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Algoritmo de Busca (SQL)</CardTitle>
          <CardDescription>
            Query SQL customizada para busca unificada. Use $1 para o termo de pesquisa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[100px] font-mono text-sm"
            value={settings.search_algorithm_sql}
            onChange={(e) => setSettings({ ...settings, search_algorithm_sql: e.target.value })}
            placeholder="SELECT * FROM products WHERE (name ILIKE '%$1%' OR sku ILIKE '%$1%') ORDER BY price_usd DESC, stock DESC LIMIT 20;"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Logística</CardTitle>
          <CardDescription>Defina como a IA deve responder sobre prazos e envios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[100px]"
            value={settings.logistics_rules_prompt}
            onChange={(e) => setSettings({ ...settings, logistics_rules_prompt: e.target.value })}
            placeholder="Se price_usd > 0: Envio de Miami..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ignorar Estoque Zerado</Label>
              <p className="text-sm text-muted-foreground">
                Se desativado, a IA só retornará produtos com stock &gt; 0.
              </p>
            </div>
            <Switch
              checked={settings.ignore_stock_count}
              onCheckedChange={(c) => setSettings({ ...settings, ignore_stock_count: c })}
            />
          </div>

          <div className="space-y-2">
            <Label>Threshold de Preço (USD) para Gatilho Premium</Label>
            <Input
              type="number"
              value={settings.price_threshold_usd}
              onChange={(e) =>
                setSettings({ ...settings, price_threshold_usd: Number(e.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Expiração de Cache (Dias)</Label>
            <Input
              type="number"
              value={settings.cache_expiration_days}
              onChange={(e) =>
                setSettings({ ...settings, cache_expiration_days: Number(e.target.value) })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  )
}
