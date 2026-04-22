import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminAISettings() {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    system_prompt_template: '',
    search_algorithm_sql: '',
    columns_desktop: 4,
    columns_mobile: 2,
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle()

      if (data) {
        const config = (data.result_component_config as any) || {}
        setSettings({
          system_prompt_template: data.system_prompt_template || '',
          search_algorithm_sql: data.search_algorithm_sql || '',
          columns_desktop: config.columns_desktop || 4,
          columns_mobile: config.columns_mobile || 2,
        })
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    if (!settings.system_prompt_template.trim()) {
      if (
        !window.confirm(
          'Campos de estratégia não podem ser salvos vazios sem confirmação de ativação do Fallback. Deseja continuar?',
        )
      ) {
        return
      }
    }

    setLoading(true)
    const payload = {
      id: '00000000-0000-0000-0000-000000000001',
      system_prompt_template: settings.system_prompt_template,
      search_algorithm_sql: settings.search_algorithm_sql,
      result_component_config: {
        columns_desktop: Number(settings.columns_desktop),
        columns_mobile: Number(settings.columns_mobile),
      },
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('ai_settings').upsert(payload)

    setLoading(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso.' })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configurações de IA</h1>
      <Card>
        <CardHeader>
          <CardTitle>Comportamento Estratégico do Agente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Prompt do Sistema (Instruções Principais)</Label>
            <Textarea
              value={settings.system_prompt_template}
              onChange={(e) => setSettings({ ...settings, system_prompt_template: e.target.value })}
              rows={8}
              placeholder="Instruções obrigatórias para o comportamento da IA..."
            />
          </div>
          <div className="space-y-2">
            <Label>Algoritmo de Busca Unificada (SQL)</Label>
            <Textarea
              value={settings.search_algorithm_sql}
              onChange={(e) => setSettings({ ...settings, search_algorithm_sql: e.target.value })}
              rows={4}
              placeholder="SELECT * FROM products WHERE name ILIKE '%$1%' ORDER BY price_usd DESC"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Colunas no Grid de Resultados (Desktop)</Label>
              <Input
                type="number"
                value={settings.columns_desktop}
                min={1}
                max={6}
                onChange={(e) =>
                  setSettings({ ...settings, columns_desktop: parseInt(e.target.value) || 4 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Colunas no Grid de Resultados (Mobile)</Label>
              <Input
                type="number"
                value={settings.columns_mobile}
                min={1}
                max={2}
                onChange={(e) =>
                  setSettings({ ...settings, columns_mobile: parseInt(e.target.value) || 2 })
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
