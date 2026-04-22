import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save } from 'lucide-react'

const formSchema = z.object({
  // ai_settings
  cache_expiration_days: z.coerce.number().min(0),
  price_threshold_usd: z.coerce.number().min(0),
  search_algorithm_sql: z.string().optional(),
  result_component_config: z.string().optional(),
  ignore_stock_count: z.boolean(),
  logistics_rules_prompt: z.string().optional(),

  // ai_agent_settings
  whatsapp_trigger_low_confidence: z.boolean(),
  whatsapp_trigger_purchase_keywords: z.boolean(),
  whatsapp_trigger_project_keywords: z.boolean(),
  whatsapp_trigger_expensive_product: z.boolean(),
  whatsapp_trigger_keywords: z.string().optional(),
  system_prompt: z.string().min(1, 'O prompt do sistema é obrigatório'),
  confidence_threshold_for_whatsapp: z.string().optional(),
  max_web_search_attempts: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof formSchema>

export default function AdminAISettings() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [aiSettingsId, setAiSettingsId] = useState<string | null>(null)
  const [aiAgentSettingsId, setAiAgentSettingsId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cache_expiration_days: 30,
      price_threshold_usd: 5000,
      search_algorithm_sql: '',
      result_component_config: '{}',
      ignore_stock_count: true,
      logistics_rules_prompt: '',
      whatsapp_trigger_low_confidence: true,
      whatsapp_trigger_purchase_keywords: true,
      whatsapp_trigger_project_keywords: true,
      whatsapp_trigger_expensive_product: true,
      whatsapp_trigger_keywords: 'comprar, orçamento, quanto custa, disponível, preço',
      system_prompt: '',
      confidence_threshold_for_whatsapp: 'low',
      max_web_search_attempts: 2,
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: aiSettingsData, error: aiSettingsError },
          { data: aiAgentSettingsData, error: aiAgentSettingsError },
        ] = await Promise.all([
          supabase.from('ai_settings').select('*').limit(1).maybeSingle(),
          supabase.from('ai_agent_settings').select('*').limit(1).maybeSingle(),
        ])

        if (aiSettingsError) throw aiSettingsError
        if (aiAgentSettingsError) throw aiAgentSettingsError

        if (aiSettingsData) {
          setAiSettingsId(aiSettingsData.id)
        }
        if (aiAgentSettingsData) {
          setAiAgentSettingsId(aiAgentSettingsData.id)
        }

        form.reset({
          cache_expiration_days: aiSettingsData?.cache_expiration_days ?? 30,
          price_threshold_usd: aiSettingsData?.price_threshold_usd ?? 5000,
          search_algorithm_sql: aiSettingsData?.search_algorithm_sql ?? '',
          result_component_config:
            typeof aiSettingsData?.result_component_config === 'string'
              ? aiSettingsData.result_component_config
              : JSON.stringify(aiSettingsData?.result_component_config || {}, null, 2),
          ignore_stock_count: aiSettingsData?.ignore_stock_count ?? true,
          logistics_rules_prompt: aiSettingsData?.logistics_rules_prompt ?? '',

          whatsapp_trigger_low_confidence:
            aiAgentSettingsData?.whatsapp_trigger_low_confidence ?? true,
          whatsapp_trigger_purchase_keywords:
            aiAgentSettingsData?.whatsapp_trigger_purchase_keywords ?? true,
          whatsapp_trigger_project_keywords:
            aiAgentSettingsData?.whatsapp_trigger_project_keywords ?? true,
          whatsapp_trigger_expensive_product:
            aiAgentSettingsData?.whatsapp_trigger_expensive_product ?? true,
          whatsapp_trigger_keywords:
            aiAgentSettingsData?.whatsapp_trigger_keywords?.join(', ') ??
            'comprar, orçamento, quanto custa, disponível, preço',
          system_prompt: aiAgentSettingsData?.system_prompt ?? '',
          confidence_threshold_for_whatsapp:
            aiAgentSettingsData?.confidence_threshold_for_whatsapp ?? 'low',
          max_web_search_attempts: aiAgentSettingsData?.max_web_search_attempts ?? 2,
        })
      } catch (error: any) {
        toast({
          title: 'Erro ao carregar',
          description: error.message,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [form, toast])

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)
    try {
      let parsedComponentConfig = {}
      if (values.result_component_config) {
        try {
          parsedComponentConfig = JSON.parse(values.result_component_config)
        } catch (e) {
          throw new Error('O JSON de Configuração de Exibição é inválido.')
        }
      }

      const keywordsArray = values.whatsapp_trigger_keywords
        ? values.whatsapp_trigger_keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k)
        : []

      const aiSettingsPayload: any = {
        cache_expiration_days: values.cache_expiration_days,
        price_threshold_usd: values.price_threshold_usd,
        search_algorithm_sql: values.search_algorithm_sql,
        result_component_config: parsedComponentConfig,
        ignore_stock_count: values.ignore_stock_count,
        logistics_rules_prompt: values.logistics_rules_prompt,
        updated_at: new Date().toISOString(),
      }

      if (aiSettingsId) {
        aiSettingsPayload.id = aiSettingsId
      }

      const aiAgentSettingsPayload: any = {
        whatsapp_trigger_low_confidence: values.whatsapp_trigger_low_confidence,
        whatsapp_trigger_purchase_keywords: values.whatsapp_trigger_purchase_keywords,
        whatsapp_trigger_project_keywords: values.whatsapp_trigger_project_keywords,
        whatsapp_trigger_expensive_product: values.whatsapp_trigger_expensive_product,
        whatsapp_trigger_keywords: keywordsArray,
        system_prompt: values.system_prompt,
        confidence_threshold_for_whatsapp: values.confidence_threshold_for_whatsapp,
        max_web_search_attempts: values.max_web_search_attempts,
        updated_at: new Date().toISOString(),
      }

      if (aiAgentSettingsId) {
        aiAgentSettingsPayload.id = aiAgentSettingsId
      }

      const [res1, res2] = await Promise.all([
        supabase.from('ai_settings').upsert(aiSettingsPayload).select().single(),
        supabase.from('ai_agent_settings').upsert(aiAgentSettingsPayload).select().single(),
      ])

      if (res1.error) throw res1.error
      if (res2.error) throw res2.error

      if (!aiSettingsId && res1.data) setAiSettingsId(res1.data.id)
      if (!aiAgentSettingsId && res2.data) setAiAgentSettingsId(res2.data.id)

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
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
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Configurações da Inteligência Artificial
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie o comportamento, limites e prompts do agente de IA. (Layout Permanente
            Secional)
          </p>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Seção A & B */}
          <Card>
            <CardHeader>
              <CardTitle>Seção A & B (Configurações de Cache e Limites)</CardTitle>
              <CardDescription>
                Define o tempo de vida do cache para respostas da IA e o limite de preço (USD) para
                filtragem de produtos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cache_expiration_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiração do Cache (Dias)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_threshold_usd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Preço (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção C */}
          <Card>
            <CardHeader>
              <CardTitle>Seção C (Gatilhos do WhatsApp)</CardTitle>
              <CardDescription>
                Alternadores (switches) para controle de comportamento baseado em confiança e
                palavras-chave.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="whatsapp_trigger_low_confidence"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Baixa Confiança</FormLabel>
                        <FormDescription>
                          Acionar especialista quando a confiança for baixa
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsapp_trigger_purchase_keywords"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Intenção de Compra</FormLabel>
                        <FormDescription>
                          Acionar especialista em palavras de compra
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsapp_trigger_project_keywords"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Projetos Complexos</FormLabel>
                        <FormDescription>
                          Acionar especialista para palavras de projeto
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsapp_trigger_expensive_product"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Produto de Alto Valor</FormLabel>
                        <FormDescription>
                          Acionar se o preço passar do limite definido
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="whatsapp_trigger_keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Palavras-chave de Acionamento (separadas por vírgula)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="confidence_threshold_for_whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limiar de Confiança</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: low" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_web_search_attempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tentativas de Busca Web</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção D */}
          <Card>
            <CardHeader>
              <CardTitle>Seção D (Algoritmo SQL)</CardTitle>
              <CardDescription>
                Editor do SQL bruto para busca de produtos. O sistema executará exatamente o que
                estiver aqui.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="search_algorithm_sql"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="font-mono text-sm min-h-[150px]"
                        placeholder="Ex: ORDER BY price_usa DESC, stock DESC"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seção E */}
          <Card>
            <CardHeader>
              <CardTitle>Seção E (AI Expert Prompt)</CardTitle>
              <CardDescription>
                Define a "personalidade" e as regras da IA. Injetado como a System Message
                principal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="system_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea {...field} className="font-mono text-sm min-h-[300px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seção F */}
          <Card>
            <CardHeader>
              <CardTitle>Seção F (Configuração de Exibição)</CardTitle>
              <CardDescription>Editor JSON para definir colunas (desktop/mobile).</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="result_component_config"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="font-mono text-sm min-h-[150px]"
                        placeholder={'{\n  "desktop_columns": 4,\n  "mobile_columns": 2\n}'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seção G */}
          <Card>
            <CardHeader>
              <CardTitle>Seção G (Estoque e Logística)</CardTitle>
              <CardDescription>Regras de entrega/origem e toggle de estoque.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="ignore_stock_count"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ignorar Contagem de Estoque</FormLabel>
                      <FormDescription>
                        Se ativado, a busca SQL não incluirá 'AND stock &gt; 0'
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logistics_rules_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt de Regras Logísticas</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="font-mono text-sm min-h-[150px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
