import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function AdminAISettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<any>({
    cache_expiration_days: 30,
    price_threshold_usd: 5000,
    result_component_config: {},
    search_algorithm_sql: '',
    system_prompt_template: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from('ai_settings').select('*').limit(1).maybeSingle()
    if (data) {
      setSettings(data)
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)

    const { data: existing } = await supabase
      .from('ai_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    let error
    if (existing) {
      const { error: updateError } = await supabase
        .from('ai_settings')
        .update({
          cache_expiration_days: settings.cache_expiration_days,
          price_threshold_usd: settings.price_threshold_usd,
          search_algorithm_sql: settings.search_algorithm_sql,
          system_prompt_template: settings.system_prompt_template,
        })
        .eq('id', existing.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('ai_settings').insert([
        {
          cache_expiration_days: settings.cache_expiration_days,
          price_threshold_usd: settings.price_threshold_usd,
          search_algorithm_sql: settings.search_algorithm_sql,
          system_prompt_template: settings.system_prompt_template,
        },
      ])
      error = insertError
    }

    setIsSaving(false)

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sucesso',
        description: 'Configurações de lógica salvas com sucesso!',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl p-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Configurações de IA</h2>
        <p className="text-white/60 mt-2">
          Gerencie o cache, limites de preço, lógica SQL e template do especialista.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Seção A - Cache</CardTitle>
            <CardDescription className="text-white/60">
              Configuração de expiração de cache (dias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="cache" className="text-white/80">
                Expiração (Dias)
              </Label>
              <Input
                id="cache"
                type="number"
                className="bg-black/50 border-white/20 text-white"
                value={settings.cache_expiration_days || ''}
                onChange={(e) =>
                  setSettings({ ...settings, cache_expiration_days: Number(e.target.value) })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Seção B - Threshold de Preço</CardTitle>
            <CardDescription className="text-white/60">
              Valor em USD para acionar o WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="price" className="text-white/80">
                Limite (USD)
              </Label>
              <Input
                id="price"
                type="number"
                className="bg-black/50 border-white/20 text-white"
                value={settings.price_threshold_usd || ''}
                onChange={(e) =>
                  setSettings({ ...settings, price_threshold_usd: Number(e.target.value) })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Seção C - UI</CardTitle>
          <CardDescription className="text-white/60">
            Configurações de interface (Internas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-white/50">Configurado internamente no momento.</div>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Seção D - Search Logic (SQL)</CardTitle>
          <CardDescription className="text-white/60">
            Insira a lógica SQL para consulta nas tabelas products, market_intelligence e
            nab_market.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="sql" className="text-white/80">
              Algoritmo de Busca SQL
            </Label>
            <Textarea
              id="sql"
              className="font-mono min-h-[150px] bg-black/50 border-white/20 text-white/90"
              placeholder="SELECT * FROM products WHERE..."
              value={settings.search_algorithm_sql || ''}
              onChange={(e) => setSettings({ ...settings, search_algorithm_sql: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Seção E - AI Expert Prompt</CardTitle>
          <CardDescription className="text-white/60">
            Defina a identidade, tom de voz e regras de soberania de dados da IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="prompt" className="text-white/80">
              Template do Prompt do Especialista
            </Label>
            <Textarea
              id="prompt"
              className="min-h-[250px] leading-relaxed bg-black/50 border-white/20 text-white/90"
              placeholder="Você é um especialista audiovisual..."
              value={settings.system_prompt_template || ''}
              onChange={(e) => setSettings({ ...settings, system_prompt_template: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto px-8 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  )
}
