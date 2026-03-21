import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Bot, Save, X, Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'

export default function AdminAISystemPrompt() {
  const { user, loading: authLoading } = useAuth()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [initialPrompt, setInitialPrompt] = useState('')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPrompt = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ai_agent_settings')
        .select('id, system_prompt')
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSettingsId(data.id)
        setInitialPrompt(data.system_prompt || '')
        setPrompt(data.system_prompt || '')
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível carregar as instruções.',
        variant: 'destructive',
        action: (
          <ToastAction altText="Tentar novamente" onClick={fetchPrompt}>
            Tentar novamente
          </ToastAction>
        ),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchPrompt()
    }
  }, [user])

  const handleSave = async () => {
    if (!settingsId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('ai_agent_settings')
        .update({ system_prompt: prompt, updated_at: new Date().toISOString() })
        .eq('id', settingsId)

      if (error) throw error

      setInitialPrompt(prompt)
      toast({ title: 'Sucesso', description: 'Instruções salvas com sucesso!' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setPrompt(initialPrompt)
  }

  if (authLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const charCount = prompt.length
  const isInvalid = charCount < 50 || charCount > 30000
  const isDirty = prompt !== initialPrompt
  const disableSave = isInvalid || !isDirty || saving || loading

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
            <BreadcrumbPage>Instruções da IA</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Bot className="w-6 h-6" />
          </div>
          Instruções do Agente de IA
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure o comportamento e respostas do agente
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Configuração Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-base font-semibold">System Prompt</Label>
              <span
                className={`text-xs font-mono ${isInvalid && isDirty ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {charCount} / 30000
              </span>
            </div>
            {loading ? (
              <Skeleton className="w-full h-[400px] rounded-md" />
            ) : (
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading || saving}
                maxLength={30000}
                className="min-h-[400px] font-mono text-sm bg-white dark:bg-zinc-950 resize-y leading-relaxed"
                placeholder="Insira as diretrizes para o agente de IA..."
              />
            )}
            <p className="text-sm text-muted-foreground">
              Estas instruções guiam como o agente IA responde. Mudanças sao aplicadas
              imediatamente.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={!isDirty || saving || loading}
            >
              <X className="w-4 h-4 mr-2" /> Descartar
            </Button>
            <Button onClick={handleSave} disabled={disableSave}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Instruções
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
