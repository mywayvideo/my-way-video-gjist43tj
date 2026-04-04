import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Settings, Building2, Shield, Wrench } from 'lucide-react'
import { AdminLayout } from '@/components/admin/AdminLayout'

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />

  return (
    <AdminLayout breadcrumb="Configurações Globais">
      <div className="max-w-4xl space-y-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Settings className="w-6 h-6" />
            </div>
            Configurações Globais
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as configurações gerais da empresa, parâmetros operacionais e segurança.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Empresa</CardTitle>
                <CardDescription>Informações cadastrais e identidade visual</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configurações da empresa estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Operacional</CardTitle>
                <CardDescription>Parâmetros de funcionamento do sistema</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configurações operacionais estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="bg-red-500/10 p-2 rounded-lg text-red-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Segurança</CardTitle>
                <CardDescription>Autenticação, permissões e acessos</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configurações de segurança estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
