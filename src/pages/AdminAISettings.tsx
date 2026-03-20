import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, Save, RotateCcw, Loader2 } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const formSchema = z.object({
  price_threshold_usd: z.coerce
    .number()
    .min(1000, 'O valor deve ser de pelo menos 1000')
    .max(100000, 'O valor máximo é 100000'),
  max_web_search_attempts: z.coerce
    .number()
    .min(1, 'O mínimo é 1 tentativa')
    .max(5, 'O máximo são 5 tentativas'),
  confidence_threshold_for_whatsapp: z.enum(['low', 'medium', 'high']),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  price_threshold_usd: 5000,
  max_web_search_attempts: 2,
  confidence_threshold_for_whatsapp: 'low',
}

export default function AdminAISettings() {
  const { user, loading: authLoading } = useAuth()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  })

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

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
          price_threshold_usd: data.price_threshold_usd || 5000,
          max_web_search_attempts: data.max_web_search_attempts || 2,
          confidence_threshold_for_whatsapp:
            (data.confidence_threshold_for_whatsapp as any) || 'low',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!settingsId) return

    try {
      const { error } = await supabase
        .from('ai_agent_settings')
        .update({
          price_threshold_usd: values.price_threshold_usd,
          max_web_search_attempts: values.max_web_search_attempts,
          confidence_threshold_for_whatsapp: values.confidence_threshold_for_whatsapp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsId)

      if (error) throw error

      form.reset(values)
      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso!' })
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Erro ao salvar configurações.', variant: 'destructive' })
    }
  }

  const handleRestoreDefaults = async () => {
    if (!settingsId) return

    try {
      const { error } = await supabase
        .from('ai_agent_settings')
        .update({
          price_threshold_usd: defaultValues.price_threshold_usd,
          max_web_search_attempts: defaultValues.max_web_search_attempts,
          confidence_threshold_for_whatsapp: defaultValues.confidence_threshold_for_whatsapp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsId)

      if (error) throw error

      form.reset(defaultValues)
      toast({ title: 'Sucesso', description: 'Valores padrão restaurados.' })
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Erro ao restaurar padrões.', variant: 'destructive' })
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
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in min-h-[70vh]">
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
          Configurações do Agente de IA
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Ajuste os parâmetros de comportamento do assistente de inteligência artificial.
        </p>
      </div>

      <div className="flex justify-center w-full">
        <Card className="w-full max-w-md border-border/50 shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Parâmetros de Decisão</CardTitle>
            <CardDescription>Valores base para gatilhos automáticos</CardDescription>
          </CardHeader>
          <CardContent>
            {initialLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                  id="settings-form"
                >
                  <FormField
                    control={form.control}
                    name="price_threshold_usd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Preço para Produtos Caros (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1000}
                            max={100000}
                            step={100}
                            disabled={isSaving}
                            {...field}
                            className="font-mono"
                          />
                        </FormControl>
                        <FormDescription>
                          Produtos acima deste valor acionam contato com especialista
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_web_search_attempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Tentativas de Busca Web</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            step={1}
                            disabled={isSaving}
                            {...field}
                            className="font-mono"
                          />
                        </FormControl>
                        <FormDescription>
                          Número máximo de buscas na web por resposta
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confidence_threshold_for_whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Confiança para Mostrar WhatsApp</FormLabel>
                        <Select
                          disabled={isSaving}
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um nível" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baixo (low)</SelectItem>
                            <SelectItem value="medium">Médio (medium)</SelectItem>
                            <SelectItem value="high">Alto (high)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Mostrar botão WhatsApp quando confiança for menor que este nível
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between border-t border-border/50 px-6 py-4 bg-muted/20">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={initialLoading || isSaving}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Restaurar Padrões
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar valores padrão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso redefinirá todos os parâmetros para as configurações recomendadas de
                    fábrica.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreDefaults}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="submit"
              form="settings-form"
              disabled={initialLoading || isSaving || !isDirty}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
