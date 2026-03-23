import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Sparkles,
  Settings,
  Package,
  Loader2,
} from 'lucide-react'
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
        <DialogContent className="sm:max-w-2xl w-[95vw] rounded-xl overflow-visible p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold mb-2">Pesquisar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <form onSubmit={handleMobileAISearch} className="w-full sm:w-1/2 relative group">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                type="text"
                placeholder="Pesquisar com IA..."
                className="w-full pl-10 h-12 rounded-xl bg-primary/5 border-primary/20"
                value={mobileAiQuery}
                onChange={(e) => setMobileAiQuery(e.target.value)}
              />
            </form>
            <div className="w-full sm:w-1/2 relative group">
              <form onSubmit={handleMobileDbSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <Input
                  type="text"
                  placeholder="Pesquisar no catalogo..."
                  className="w-full pl-10 h-12 rounded-xl bg-blue-500/5 border-blue-500/20"
                  value={mobileDbQuery}
                  onChange={(e) => setMobileDbQuery(e.target.value)}
                />
              </form>
              {mobileDbQuery.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 max-h-[60vh] overflow-y-auto">
                  {isSearchingDb ? (
                    <div className="p-4 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Buscando...
                    </div>
                  ) : mobileDbResults.length > 0 ? (
                    <>
                      {mobileDbResults.slice(0, 6).map((p) => (
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
                              className="w-10 h-10 object-contain rounded bg-white/5"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded">
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
                      <button
                        onClick={() => {
                          setShowMobileSearch(false)
                          navigate(`/search?type=database&q=${encodeURIComponent(mobileDbQuery)}`)
                        }}
                        className="w-full p-3 text-sm text-center text-blue-500 font-medium hover:bg-muted/50 transition-colors"
                      >
                        Ver todos os resultados
                      </button>
                    </>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum equipamento encontrado.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
