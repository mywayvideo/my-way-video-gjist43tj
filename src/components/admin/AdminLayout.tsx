import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  Package,
  DollarSign,
  Truck,
  Tag,
  Settings,
  Menu,
  ChevronRight,
  User,
  LogOut,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { useSidebarState } from '@/hooks/use-sidebar-state'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingCart },
  { name: 'IA & Inteligência Artificial', href: '/admin/ai', icon: Bot },
  { name: 'Catálogo & Produtos', href: '/admin/catalog', icon: Package },
  { name: 'Preços & Câmbio', href: '/admin/pricing', icon: DollarSign },
  { name: 'Fretes & Shipping', href: '/admin/shipping-config', icon: Truck },
  { name: 'Descontos & Promoções', href: '/admin/discounts', icon: Tag },
  { name: 'Configurações Globais', href: '/admin/settings', icon: Settings },
]

export function AdminLayout({
  children,
  breadcrumb,
}: {
  children: React.ReactNode
  breadcrumb?: string
}) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const { isVisible, toggleSidebar } = useSidebarState()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const NavLinks = () => (
    <div className="flex flex-col gap-2">
      {navigation.map((item) => {
        const isActive =
          location.pathname === item.href ||
          (item.href !== '/admin' && location.pathname.startsWith(item.href))
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive
                ? 'bg-primary/20 text-primary font-medium'
                : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        )
      })}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-destructive/10 text-destructive hover:text-destructive w-full text-left mt-4"
      >
        <LogOut className="w-5 h-5" />
        Sair
      </button>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row w-full flex-1 min-h-[calc(100vh-4rem)] bg-background">
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-border/50 bg-card shrink-0 transition-[width,opacity] duration-300 ease-in-out overflow-hidden',
          isVisible ? 'w-[280px] opacity-100' : 'w-0 opacity-0 border-r-0',
        )}
      >
        <div className="w-[280px] flex flex-col h-full">
          <div className="p-6 flex items-center gap-3 border-b border-border/50">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight truncate">Admin Panel</span>
          </div>
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            <NavLinks />
          </div>
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-none truncate">
                  {user?.user_metadata?.name || 'Admin'}
                </span>
                <span className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden md:flex w-11 h-11"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden w-11 h-11">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col border-r-border/50">
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                <div className="p-6 flex items-center gap-3 border-b border-border/50">
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
                    <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-xl tracking-tight truncate">Admin Panel</span>
                </div>
                <div className="flex-1 px-4 py-6 overflow-y-auto">
                  <NavLinks />
                </div>
                <div className="p-4 border-t border-border/50">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium leading-none truncate">
                        {user?.user_metadata?.name || 'Admin'}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 truncate">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center text-sm font-medium text-muted-foreground">
              <Link to="/admin" className="hover:text-foreground transition-colors hidden sm:block">
                Admin
              </Link>
              <span className="sm:hidden">Admin</span>
              {breadcrumb && (
                <>
                  <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
                  <span className="text-foreground truncate max-w-[200px] sm:max-w-none">
                    {breadcrumb}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</div>
      </main>
    </div>
  )
}
