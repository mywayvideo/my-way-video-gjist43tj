import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, Menu, X, Sparkles, Settings, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/use-auth'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/stores/useCartStore'
import logoUrl from '@/assets/mw_logo_horiz_1200x318_fundo_escuro-a5934.png'
import { DirectSearch } from '@/components/DirectSearch'
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog'
import { useDebounce } from '@/hooks/use-debounce'
import { searchProducts } from '@/services/database-search'

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [mobileAiQuery, setMobileAiQuery] = useState('')
  const [mobileDbQuery, setMobileDbQuery] = useState('')
  const { totalItems } = useCartStore()

  const [mobileDbResults, setMobileDbResults] = useState<any[]>([])
  const [isSearchingDb, setIsSearchingDb] = useState(false)
  const debouncedDbQuery = useDebounce(mobileDbQuery, 300)

  const isAdmin =
    user &&
    (user.app_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      (user as any).role === 'admin')

  useEffect(() => {
    if (debouncedDbQuery.trim().length >= 2) {
      setIsSearchingDb(true)
      searchProducts(debouncedDbQuery.trim()).then((results) => {
        setMobileDbResults(results || [])
        setIsSearchingDb(false)
      })
    } else {
      setMobileDbResults([])
      setIsSearchingDb(false)
    }
  }, [debouncedDbQuery])

  const handleAISearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsSheetOpen(false)
    }
  }

  const handleMobileAISearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (mobileAiQuery.trim()) {
      navigate(`/search?type=ai&q=${encodeURIComponent(mobileAiQuery.trim())}`)
      setShowMobileSearch(false)
      setMobileAiQuery('')
    }
  }

  const handleMobileDbSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (mobileDbQuery.trim()) {
      navigate(`/search?type=database&q=${encodeURIComponent(mobileDbQuery.trim())}`)
      setShowMobileSearch(false)
      setMobileDbQuery('')
    }
  }

  const openMobileSearch = () => {
    window.dispatchEvent(new CustomEvent('clear-search-response'))
    setMobileAiQuery('')
    setMobileDbQuery('')
    setShowMobileSearch(true)
  }

  return (
    <>
      <Dialog open={showMobileSearch} onOpenChange={setShowMobileSearch}>
        <DialogContent className="!top-0 !translate-y-0 sm:!top-[10%] sm:!translate-y-0 !max-w-full w-full sm:w-[95vw] sm:max-w-2xl !rounded-t-none sm:!rounded-xl !max-h-[65vh] flex flex-col p-4 overflow-hidden gap-0 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Pesquisar</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 shrink-0 pt-6">
            <form onSubmit={handleMobileDbSearch} className="relative w-full sm:w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
              <Input
                type="text"
                placeholder="Pesquisar no catálogo..."
                className="w-full pl-10 h-12 rounded-xl bg-blue-500/5 border-blue-500/20"
                value={mobileDbQuery}
                onChange={(e) => setMobileDbQuery(e.target.value)}
              />
            </form>
            <form onSubmit={handleMobileAISearch} className="relative w-full sm:w-1/2">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                type="text"
                placeholder="Pesquisar com IA..."
                className="w-full pl-10 h-12 rounded-xl bg-primary/5 border-primary/20"
                value={mobileAiQuery}
                onChange={(e) => setMobileAiQuery(e.target.value)}
              />
            </form>
          </div>

          {mobileDbQuery.trim().length >= 2 && (
            <div className="flex-1 overflow-y-auto mt-4 scroll-smooth min-h-0 border border-border/20 rounded-xl bg-muted/10">
              {isSearchingDb ? (
                <div className="flex flex-col">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 border-b border-border/50 last:border-0"
                    >
                      <div className="w-10 h-10 rounded bg-muted animate-pulse shrink-0" />
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : mobileDbResults.length > 0 ? (
                <div className="flex flex-col">
                  {mobileDbResults.slice(0, 10).map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.id}`}
                      onClick={() => {
                        setShowMobileSearch(false)
                        setMobileDbQuery('')
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors border-b border-border/50 last:border-0"
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="w-10 h-10 object-contain rounded bg-white/5 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-sm font-medium truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {p.sku} • {p.category || 'Geral'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-3 h-full">
                  <Package className="w-8 h-8 text-muted-foreground/30" />
                  <span className="font-medium text-base text-foreground">Nenhum resultado</span>
                  <p className="text-sm text-muted-foreground">
                    Nenhum equipamento encontrado para "{mobileDbQuery}".
                  </p>
                </div>
              )}
            </div>
          )}

          {mobileDbQuery.trim().length >= 2 && !isSearchingDb && mobileDbResults.length > 0 && (
            <div className="shrink-0 pt-4 mt-auto">
              <button
                onClick={() => {
                  setShowMobileSearch(false)
                  navigate(`/search?type=database&q=${encodeURIComponent(mobileDbQuery)}`)
                }}
                className="w-full p-4 text-sm text-center text-white bg-blue-500 font-medium hover:bg-blue-600 transition-colors rounded-xl shadow-sm"
              >
                Ver todos os resultados
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={openMobileSearch}>
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
