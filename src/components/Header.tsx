import { Link } from 'react-router-dom'
import { ShoppingCart, User, Video, Search } from 'lucide-react'
import { useCartStore } from '@/stores/useCartStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function Header() {
  const { itemCount } = useCartStore()

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

        <div className="flex items-center gap-4">
          <Link to="/search">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent">
              <Search className="w-5 h-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <User className="w-5 h-5" />
          </Button>
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
