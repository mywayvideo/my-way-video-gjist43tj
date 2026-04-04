import { useState } from 'react'
import { useDiscountRules } from '@/hooks/useDiscountRules'
import { Discount } from '@/types/discount'
import DiscountRuleForm from './components/DiscountRuleForm'
import DiscountRulesList from './components/DiscountRulesList'
import { Button } from '@/components/ui/button'
import {
  Plus,
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
  Bot,
  Package,
  DollarSign,
  Truck,
  Tag,
  Settings,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'

function AdminSidebar() {
  const location = useLocation()

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard-admin' },
    { title: 'IA & Inteligência Artificial', icon: Bot, path: '/admin/ai' },
    { title: 'Catálogo & Produtos', icon: Package, path: '/admin/catalog' },
    { title: 'Preços & Câmbio', icon: DollarSign, path: '/admin/pricing' },
    { title: 'Fretes & Shipping', icon: Truck, path: '/admin/shipping-config' },
    { title: 'Descontos & Promoções', icon: Tag, path: '/admin/discounts' },
    { title: 'Configurações Globais', icon: Settings, path: '/admin/settings' },
  ]

  return (
    <Sidebar className="border-r border-border/50 bg-card">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 font-bold text-lg px-2">
          <LayoutGrid className="w-5 h-5" />
          <span>Admin Panel</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2 mt-4 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path)
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={
                      isActive
                        ? 'bg-secondary text-secondary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-secondary/50'
                    }
                  >
                    <Link
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default function AdminDiscountsPage() {
  const {
    discounts,
    products,
    loading,
    error,
    loadData,
    createDiscount,
    updateDiscount,
    deleteDiscount,
  } = useDiscountRules()
  const [editingRule, setEditingRule] = useState<Discount | 'new' | null>(null)

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex items-center text-sm text-muted-foreground mb-6">
              <Link to="/admin" className="hover:text-foreground transition-colors">
                Admin
              </Link>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="text-foreground">Regras de Desconto</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/50 rounded-lg">
                  <Tag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Regras de Desconto</h1>
                  <p className="text-sm text-muted-foreground">
                    Gerencie as regras de descontos e promoções do catálogo.
                  </p>
                </div>
              </div>
              {!editingRule && (
                <Button
                  onClick={() => setEditingRule('new')}
                  className="bg-yellow-500 text-black hover:bg-yellow-600 font-semibold shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Criar Nova Regra
                </Button>
              )}
            </div>

            {error && !editingRule && (
              <div className="text-center py-12 px-6 border rounded-lg bg-card shadow-sm">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Não foi possível carregar as regras</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={loadData} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
                </Button>
              </div>
            )}

            {!error && !editingRule && (
              <DiscountRulesList
                loading={loading}
                discounts={discounts}
                onEdit={(rule) => setEditingRule(rule)}
                onDelete={deleteDiscount}
                onCreateNew={() => setEditingRule('new')}
              />
            )}

            {editingRule && (
              <DiscountRuleForm
                rule={typeof editingRule === 'string' ? undefined : editingRule}
                products={products}
                onClose={() => setEditingRule(null)}
                onSave={async (payload) => {
                  const success =
                    typeof editingRule === 'string'
                      ? await createDiscount(payload)
                      : await updateDiscount(editingRule.id, payload)
                  if (success) {
                    setEditingRule(null)
                    return true
                  }
                  return false
                }}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
