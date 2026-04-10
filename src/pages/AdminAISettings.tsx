import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, Save, Loader2 } from 'lucide-react'
import { ToastAction } from '@/components/ui/toast'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

const formSchema = z.object({
  cache_expiration_days: z.coerce
    .number()
    .min(1, 'O valor deve ser de pelo menos 1')
    .max(365, 'O valor máximo é 365'),
  price_threshold_usd: z.coerce
    .number()
    .min(100, 'O valor deve ser de pelo menos 100')
    .max(100000, 'O valor máximo é 100000'),
  whatsapp_trigger_low_confidence: z.boolean(),
  whatsapp_trigger_purchase_keywords: z.boolean(),
  whatsapp_trigger_project_keywords: z.boolean(),
  whatsapp_trigger_expensive_product: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  cache_expiration_days: 30,
  price_threshold_usd: 5000,
  whatsapp_trigger_low_confidence: true,
  whatsapp_trigger_purchase_keywords: true,
  whatsapp_trigger_project_keywords: true,
  whatsapp_trigger_expensive_product: true,
}

export default function AdminAISettings() {
  const { currentUser: user, loading: authLoading } = useAuthContext()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  })

  const fetchSettings = async () => {
    try {
      setInitialLoading(true)
      const { data, error } = await supabase
        .from('ai_agent_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSettingsId(data.id)
        form.reset({
          cache_expiration_days: data.cache_expiration_days ?? 30,
          price_threshold_usd: data.price_threshold_usd ?? 5000,
          whatsapp_trigger_low_confidence: data.whatsapp_trigger_low_confidence ?? true,
          whatsapp_trigger_purchase_keywords: data.whatsapp_trigger_purchase_keywords ?? true,
          whatsapp_trigger_project_keywords: data.whatsapp_trigger_project_keywords ?? true,
          whatsapp_trigger_expensive_product: data.whatsapp_trigger_expensive_product ?? true,
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
        action: (
          <ToastAction altText="Tentar novamente" onClick={fetchSettings}>
            Tentar novamente
          </ToastAction>
        ),
      })
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  const onSubmit = async (values: FormValues) => {
    if (!settingsId) return

    try {
      const { error } = await supabase
        .from('ai_agent_settings')
        .update({
          cache_expiration_days: values.cache_expiration_days,
          price_threshold_usd: values.price_threshold_usd,
          whatsapp_trigger_low_confidence: values.whatsapp_trigger_low_confidence,
          whatsapp_trigger_purchase_keywords: values.whatsapp_trigger_purchase_keywords,
          whatsapp_trigger_project_keywords: values.whatsapp_trigger_project_keywords,
          whatsapp_trigger_expensive_product: values.whatsapp_trigger_expensive_product,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsId)

      if (error) throw error

      form.reset(values)
      toast({ title: 'Sucesso', description: 'Configuracoes salvas com sucesso!' })
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Erro ao salvar configurações.', variant: 'destructive' })
    }
  }

  if (authLoading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />

  const isSaving = form.formState.isSubmitting
  const isDirty = form.formState.isDirty

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in min-h-[70vh]">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>AI Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Settings className="w-6 h-6" />
          </div>
          Configuracoes de IA
        </h1>
        <p className="text-muted-foreground mt-2">Ajuste limites, cache e triggers do WhatsApp</p>
      </div>

      {initialLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Section A - Cache Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="cache_expiration_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cache Expiration (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          disabled={isSaving}
                          {...field}
                          className="font-mono max-w-md"
                        />
                      </FormControl>
                      <FormDescription>
                        Produtos nao cadastrados sao cacheados por X dias.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Section B - Price Threshold</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="price_threshold_usd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Threshold (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={100}
                          max={100000}
                          disabled={isSaving}
                          {...field}
                          className="font-mono max-w-md"
                        />
                      </FormControl>
                      <FormDescription>
                        Produtos acima deste valor ativam WhatsApp button.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Section C - WhatsApp Button Triggers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="whatsapp_trigger_low_confidence"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-base">Low Confidence</FormLabel>
                        <FormDescription>
                          Mostrar botao quando agente nao consegue responder.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp_trigger_purchase_keywords"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-base">Purchase Keywords</FormLabel>
                        <FormDescription>
                          Mostrar botao quando usuario menciona compra. (Ex: comprar, orcamento,
                          quanto custa)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp_trigger_project_keywords"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-base">Project Keywords</FormLabel>
                        <FormDescription>
                          Mostrar botao quando usuario menciona projeto. (Ex: integracao,
                          customizacao, setup)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp_trigger_expensive_product"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-base">Expensive Product</FormLabel>
                        <FormDescription>
                          Mostrar botao quando produto custa acima do threshold.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4 pb-8">
              <Button type="submit" disabled={!isDirty || isSaving} size="lg">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}
