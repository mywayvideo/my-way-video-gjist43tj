import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, Menu, X, Sparkles, Box, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/stores/useCartStore'
import logoUrl from '@/assets/mw_logo_horiz_1200x318_fundo_escuro-a5934.png'
import { DirectSearch } from '@/components/DirectSearch'
import { SearchTypeDialog } from '@/components/SearchTypeDialog'

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showSearchTypeDialog, setShowSearchTypeDialog] = useState(false)
  const [selectedSearchType, setSelectedSearchType] = useState<'ai' | 'database'>('ai')
  const { totalItems } = useCartStore()

  const isAdmin =
    user &&
    (user.app_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      (user as any).role === 'admin')

  const handleAISearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsSheetOpen(false)
    }
  }

  const openSearchTypeDialog = () => {
    window.dispatchEvent(new CustomEvent('clear-search-response'))
    setShowSearchTypeDialog(true)
  }

  const selectSearchType = (type: 'ai' | 'database') => {
    setSelectedSearchType(type)
    setShowSearchTypeDialog(false)
    navigate(`/search?type=${type}`)
  }

  return (
    <>
      <SearchTypeDialog
        open={showSearchTypeDialog}
        onOpenChange={setShowSearchTypeDialog}
        onSelect={selectSearchType}
      />
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm">
                <nav className="flex flex-col gap-6 mt-8">
                  <Link
                    to="/"
                    onClick={() => setIsSheetOpen(false)}
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    Início
                  </Link>
                  <Link
                    to="/search"
                    onClick={() => setIsSheetOpen(false)}
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    Catálogo de Produtos
                  </Link>
                  <div className="pt-6 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Acesso Rápido
                    </p>
                    <DirectSearch />
                  </div>
                  <div className="pt-4">
                    <form onSubmit={handleAISearch} className="w-full relative group">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input
                        type="text"
                        placeholder="Pergunte à IA Especialista..."
                        className="w-full pl-10 h-10 rounded-xl bg-primary/5 border-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </form>
                  </div>
                  {isAdmin && (
                    <div className="pt-4 border-t border-border/50 mt-auto">
                      <Link
                        to="/admin"
                        onClick={() => setIsSheetOpen(false)}
                        className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                      >
                        <Settings className="w-5 h-5" /> Painel Admin
                      </Link>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center space-x-2 shrink-0">
              <img
                src={logoUrl}
                alt="My Way Video"
                className="h-8 md:h-10 w-auto hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 max-w-4xl mx-6 gap-6 items-center">
            <div className="w-1/2 relative">
              <DirectSearch />
            </div>
            <div className="w-1/2 relative">
              <form onSubmit={handleAISearch} className="w-full relative group shadow-sm">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 group-focus-within:text-primary group-focus-within:animate-pulse transition-all" />
                <Input
                  type="text"
                  placeholder="Pergunte à IA (Ex: Câmera 4K Broadcast?)"
                  className="w-full pl-10 pr-10 h-10 rounded-full bg-primary/5 border-primary/20 focus-visible:bg-background focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary transition-all placeholder:text-muted-foreground/70"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </form>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={openSearchTypeDialog}
            >
              <Search className="w-5 h-5" />
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex relative group hover:bg-primary/10 transition-colors"
                onClick={() => navigate('/admin')}
                title="Painel Admin"
                aria-label="Painel Admin"
              >
                <Settings className="w-6 h-6 group-hover:text-primary transition-colors" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="relative group hover:bg-primary/10 transition-colors"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="w-5 h-5 group-hover:text-primary transition-colors" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-in zoom-in border-2 border-background">
                  {totalItems}
                </span>
              )}
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sair
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => navigate('/login')}>
                <User className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
