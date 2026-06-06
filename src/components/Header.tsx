import { Link } from 'react-router-dom'
import { DirectSearch } from '@/components/DirectSearch'
import { ShoppingCart, User, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight shrink-0">
          <span className="text-primary">MY WAY</span>
          <span className="hidden sm:inline-block">VIDEO</span>
        </Link>

        <div className="flex-1 flex justify-center max-w-2xl px-2 md:px-4">
          <DirectSearch />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <Link to="/favorites">
              <Heart className="w-5 h-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cart">
              <ShoppingCart className="w-5 h-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/login">
              <User className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
