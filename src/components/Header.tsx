import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Video, Search, LogOut, Settings } from 'lucide-react'
import { useCartStore } from '@/stores/useCartStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Header() {
  const { itemCount } = useCartStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-accent text-accent-foreground p-2 rounded-lg group-hover:scale-105 transition-transform">
            <Video className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight uppercase">
            My Way<span className="text-muted-foreground font-light ml-1">Video</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Equipamentos
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors">
            Serviços
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors">
            Projetos
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors">
            Sobre
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/search">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent">
              <Search className="w-5 h-5" />
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-accent hover:text-accent/80 hover:bg-accent/10"
                >
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-white/10">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {user.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Painel Admin</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 text-foreground"
                >
                  Cadastrar
                </Button>
              </Link>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground">
                {itemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
