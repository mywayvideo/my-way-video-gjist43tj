import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Database } from '@/lib/supabase/types'
import { AdminAIProviderCard } from '@/components/AdminAIProviderCard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Bot, Box } from 'lucide-react'

type AIProvider = Database['public']['Tables']['ai_providers']['Row']

export default function AdminAIProviders() {
  const { user, loading: authLoading } = useAuth()
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProviders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ai_providers')
      .select('*')
      .order('priority_order', { ascending: true })
    if (error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar provedores. Tente novamente.',
        variant: 'destructive',
      })
    else setProviders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchProviders()
  }, [user])

  if (authLoading)
    return (
      <div className="p-8 flex justify-center">
        <Box className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />

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
            <BreadcrumbPage>AI Providers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Bot className="w-6 h-6" />
          </div>
          Configurar Provedores de IA
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Gerencie as chaves de API, valide conexões e defina a prioridade de fallback para o agente
          de engenharia de IA da plataforma.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border/50 rounded-xl p-6 space-y-4 bg-card">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
              <div className="flex justify-between mt-6">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => (
            <AdminAIProviderCard
              key={p.id}
              provider={p}
              allProviders={providers}
              onRefresh={fetchProviders}
            />
          ))}
        </div>
      )}
    </div>
  )
}
