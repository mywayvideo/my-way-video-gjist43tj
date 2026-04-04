import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
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
  const { user } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

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
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row w-full flex-1 min-h-[calc(100vh-4rem)] bg-background">
      <aside className="hidden md:flex w-[280px] flex-col border-r border-border/50 bg-card shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">Admin Panel</span>
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
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col border-r-border/50">
                <div className="p-6 flex items-center gap-3 border-b border-border/50">
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-xl tracking-tight">Admin Panel</span>
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
