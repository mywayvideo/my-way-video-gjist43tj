import { Link, Navigate } from 'react-router-dom'
import {
  Bot,
  Package,
  DollarSign,
  Truck,
  Tag,
  Settings,
  Plus,
  RefreshCw,
  Layers,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { useAuth } from '@/hooks/use-auth'

export default function Admin() {
  const { user, loading: authLoading } = useAuth()

  const cards = [
    {
      title: 'IA & Inteligência Artificial',
      desc: 'System prompt, agentes, configurações globais',
      icon: Bot,
      href: '/admin/ai',
    },
    {
      title: 'Catálogo & Produtos',
      desc: 'Importar CSV, novo equipamento, inventário',
      icon: Package,
      href: '/admin/catalog',
    },
    {
      title: 'Preços & Câmbio',
      desc: 'Taxa de câmbio, margem, spread, configurações',
      icon: DollarSign,
      href: '/admin/pricing',
    },
    {
      title: 'Fretes & Shipping',
      desc: 'São Paulo, Miami, USA, pesos adicionais',
      icon: Truck,
      href: '/admin/shipping-config',
    },
    {
      title: 'Descontos & Promoções',
      desc: 'Regras de desconto, promoções ativas',
      icon: Tag,
      href: '/admin/discounts',
    },
    {
      title: 'Configurações Globais',
      desc: 'Empresa, operacional, segurança',
      icon: Settings,
      href: '/admin/settings',
    },
  ]

  if (authLoading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo ao centro de controle da My Way Video.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link key={card.title} to={card.href} className="block group">
              <Card className="h-full transition-all duration-200 border-border/50 bg-card hover:bg-card/80 hover:border-primary/50 hover:shadow-md hover:-translate-y-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <card.icon className="w-5 h-5" />
                    </div>
                    {card.title}
                  </CardTitle>
                  <CardDescription className="pt-2 text-sm">{card.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-semibold tracking-tight">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-4">
            <Button asChild className="gap-2 shadow-sm">
              <Link to="/admin/catalog">
                <Plus className="w-4 h-4" /> Novo Produto
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2 shadow-sm">
              <Link to="/admin/discounts">
                <Tag className="w-4 h-4" /> Novo Desconto
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="gap-2 bg-background/50 backdrop-blur-sm shadow-sm"
            >
              <Link to="/admin/pricing">
                <RefreshCw className="w-4 h-4" /> Atualizar Taxa
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="gap-2 bg-background/50 backdrop-blur-sm shadow-sm"
            >
              <Link to="/admin/ai-providers">
                <Layers className="w-4 h-4" /> Gerenciar Provedores
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-semibold tracking-tight">Atividades Recentes</h2>
          <Card className="border-border/50 shadow-sm bg-card/50">
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <LayoutDashboard className="w-6 h-6 opacity-20" />
              </div>
              <p>Nenhuma atividade recente para exibir.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
