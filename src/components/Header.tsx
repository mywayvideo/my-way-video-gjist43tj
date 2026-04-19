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
  LayoutDashboard,
  Heart,
  History,
  KeyRound,
  LogOut,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuthContext } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { useCart } from '@/hooks/useCart'
import logoUrl from '@/assets/mw_logo_horiz_1200x318_fundo_escuro-a5934.png'
import { DirectSearch } from '@/components/DirectSearch'
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog'
import { useDebounce } from '@/hooks/use-debounce'
import { searchProducts } from '@/services/database-search'
import { useCurrentCustomer } from '@/hooks/use-current-customer'
import useSearchState from '@/hooks/useSearchState'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useIsMobile } from '@/hooks/use-mobile'
import { AISearchResults } from '@/components/AISearchResults'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import { useFavorites } from '@/hooks/useFavorites'

export function Header() {
  const { currentUser: user, userRole, signOut } = useAuthContext()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [mobileAiQuery, setMobileAiQuery] = useState('')
  const [isAiNavigating, setIsAiNavigating] = useState(false)
  const [isMobileAiNavigating, setIsMobileAiNavigating] = useState(false)
  const [mobileDbQuery, setMobileDbQuery] = useState('')
  const cartContext = useCart() as any
  const itemsArray = cartContext?.items || cartContext?.cartItems || cartContext?.cart || []
  const totalItemCount = itemsArray.reduce(
    (acc: number, item: any) => acc + (item.quantity || 1),
    0,
  )
  const { customer } = useCurrentCustomer()
  const { saveSearchState } = useSearchState()
  const { favorites } = useFavorites()

  const [mobileDbResults, setMobileDbResults] = useState<any[]>([])
  const [isSearchingDb, setIsSearchingDb] = useState(false)
  const debouncedDbQuery = useDebounce(mobileDbQuery, 300)

  const isMobile = useIsMobile()
  const [aiSearchLoading, setAiSearchLoading] = useState(false)
  const [aiSearchResult, setAiSearchResult] = useState<any>(null)
  const [aiSearchError, setAiSearchError] = useState<string | null>(null)
  const [showAiDropdown, setShowAiDropdown] = useState(false)
  const [activeSearchType, setActiveSearchType] = useState<'db' | 'ai' | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [hasLoggedOut, setHasLoggedOut] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(userRole === 'admin')
  }, [userRole])

  useEffect(() => {
    const handleLogoutEvent = () => {
      setProfilePhotoUrl(null)
      setFirstName('')
      setIsUserMenuOpen(false)
      setHasLoggedOut(true)
    }

    window.addEventListener('auth-logout', handleLogoutEvent)
    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent)
    }
  }, [])

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('customers')
        .select('full_name, profile_photo_url')
        .eq('user_id', user.id)
        .single()

      if (!error && data) {
        if (data.full_name) {
          setFirstName(data.full_name.split(' ')[0])
        }
        if (data.profile_photo_url) {
          setProfilePhotoUrl(data.profile_photo_url)
        }
      }
    }
    fetchCustomerData()
  }, [user])

  const UserMenuItems = () => {
    const isAdminUser = !hasLoggedOut && isAdmin

    return (
      <div className="flex flex-col w-full gap-1">
        <Link
          to={isAdminUser ? '/admin' : '/dashboard'}
          onClick={() => setIsUserMenuOpen(false)}
          className="p-[10px] px-[16px] text-sm text-foreground hover:bg-muted focus:bg-muted cursor-pointer transition-colors rounded-md flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" /> {isAdminUser ? 'Painel Admin' : 'Meu Dashboard'}
        </Link>

        {!isAdminUser && (
          <>
            <Link
              to="/favorites"
              onClick={() => setIsUserMenuOpen(false)}
              className="p-[10px] px-[16px] text-sm text-foreground hover:bg-muted focus:bg-muted cursor-pointer transition-colors rounded-md flex items-center gap-2"
            >
              <Heart className="w-4 h-4" /> Meus Favoritos
            </Link>
            <Link
              to="/cart"
              onClick={() => setIsUserMenuOpen(false)}
              className="p-[10px] px-[16px] text-sm text-foreground hover:bg-muted focus:bg-muted cursor-pointer transition-colors rounded-md flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Meu Carrinho
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setIsUserMenuOpen(false)}
              className="p-[10px] px-[16px] text-sm text-foreground hover:bg-muted focus:bg-muted cursor-pointer transition-colors rounded-md flex items-center gap-2"
            >
              <History className="w-4 h-4" /> Histórico de Compras
            </Link>
          </>
        )}

        <button
          onClick={() => {
            setIsUserMenuOpen(false)
            setShowChangePassword(true)
          }}
          className="w-full text-left p-[10px] px-[16px] text-sm text-foreground hover:bg-muted focus:bg-muted cursor-pointer transition-colors rounded-md flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4" /> Alterar Senha
        </button>
        <div className="h-px bg-border my-1" />
        <button
          onClick={() => {
            setIsUserMenuOpen(false)
            handleLogout()
          }}
          className="w-full text-left p-[10px] px-[16px] text-sm text-foreground hover:bg-muted focus:bg-muted hover:text-destructive focus:text-destructive cursor-pointer transition-colors rounded-md flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    )
  }

  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem('auth-token')
    toast.success('Voce foi desconectado com sucesso!')
    navigate('/login')
  }

  useEffect(() => {
    if (debouncedDbQuery.trim().length >= 2) {
      setIsSearchingDb(true)
      setActiveSearchType('db')
      searchProducts(debouncedDbQuery.trim()).then((results) => {
        setMobileDbResults(results || [])
        setIsSearchingDb(false)
      })
    } else {
      setMobileDbResults([])
      setIsSearchingDb(false)
      if (activeSearchType === 'db') setActiveSearchType(null)
    }
  }, [debouncedDbQuery])

  const handleSheetAISearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsAiNavigating(true)
      saveSearchState(searchQuery.trim(), null, [], 'ai')
      setTimeout(() => {
        navigate(`/search?type=ai&q=${encodeURIComponent(searchQuery.trim())}`)
        setIsSheetOpen(false)
        setIsAiNavigating(false)
        setSearchQuery('')
      }, 300)
    }
  }

  const handleDesktopAISearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setShowAiDropdown(true)
    setAiSearchLoading(true)
    setAiSearchError(null)

    try {
      const { data, error } = await supabase.functions.invoke('call-ai-agent', {
        body: { query: searchQuery.trim(), session_id: crypto.randomUUID() },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setAiSearchResult(data)
      saveSearchState(searchQuery.trim(), null, data?.referenced_internal_products || [], 'ai')
    } catch (err: any) {
      setAiSearchError(err.message || 'Erro ao processar pesquisa')
    } finally {
      setAiSearchLoading(false)
    }
  }

  const handleMobileAISearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mobileAiQuery.trim()) return

    setAiSearchLoading(true)
    setAiSearchError(null)
    setIsMobileAiNavigating(true)
    setActiveSearchType('ai')

    try {
      const { data, error } = await supabase.functions.invoke('call-ai-agent', {
        body: { query: mobileAiQuery.trim(), session_id: crypto.randomUUID() },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setAiSearchResult(data)
      saveSearchState(mobileAiQuery.trim(), null, data?.referenced_internal_products || [], 'ai')
    } catch (err: any) {
      setAiSearchError(err.message || 'Erro ao processar pesquisa')
    } finally {
      setAiSearchLoading(false)
      setIsMobileAiNavigating(false)
    }
  }

  const handleMobileDbSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (mobileDbQuery.trim()) {
      saveSearchState(mobileDbQuery.trim(), null, [], 'database')
      navigate(`/search?type=database&q=${encodeURIComponent(mobileDbQuery.trim())}`)
      setShowMobileSearch(false)
      setMobileDbQuery('')
    }
  }

  const openMobileSearch = () => {
    window.dispatchEvent(new CustomEvent('clear-search-response'))
    setMobileAiQuery('')
    setMobileDbQuery('')
    setActiveSearchType(null)
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
            <form onSubmit={handleMobileDbSearch} className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
              <Input
                type="text"
                placeholder="Pesquisar no catálogo..."
                className="w-full pl-12 pr-4 h-14 text-base rounded-xl bg-blue-500/5 border-blue-500/20 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                value={mobileDbQuery}
                onChange={(e) => setMobileDbQuery(e.target.value)}
              />
            </form>
          </div>

          {activeSearchType === 'ai' ? (
            <div className="flex-1 overflow-y-auto mt-4 scroll-smooth min-h-0 rounded-xl">
              <AISearchResults
                isLoading={aiSearchLoading}
                result={aiSearchResult}
                error={aiSearchError}
                className="h-full border-0"
              />
            </div>
          ) : activeSearchType === 'db' && mobileDbQuery.trim().length >= 2 ? (
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
          ) : null}

          {activeSearchType === 'db' &&
            mobileDbQuery.trim().length >= 2 &&
            !isSearchingDb &&
            mobileDbResults.length > 0 && (
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

      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm p-4 flex justify-between items-center">
        <div className="container mx-auto px-0 md:px-4 h-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
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
                      Catálogo de Produtos
                    </p>
                    <DirectSearch />
                  </div>
                  {!hasLoggedOut && isAdmin && (
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

            <Link
              to="/"
              className="flex items-center space-x-2 shrink-0 max-w-[130px] md:max-w-[180px]"
            >
              <img
                src={logoUrl}
                alt="My Way Video"
                className="h-7 md:h-10 w-auto object-contain hover:opacity-90 transition-opacity cursor-pointer"
              />
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 max-w-2xl mx-auto px-6 items-center">
            <div className="w-full relative">
              <DirectSearch />
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={openMobileSearch}>
              <Search className="w-5 h-5" />
            </Button>

            {!hasLoggedOut && isAdmin && (
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
              className="hidden sm:flex relative group hover:bg-primary/10 transition-colors"
              onClick={() => navigate('/favorites')}
              title="Meus Favoritos"
              aria-label="Meus Favoritos"
            >
              <Heart className="w-5 h-5 group-hover:text-primary transition-colors" />
              {favorites.length > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-in zoom-in border-2 border-background">
                  {favorites.length}
                </span>
              )}
            </Button>

            {user && !hasLoggedOut ? (
              isMobile ? (
                <Sheet open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
                  <SheetTrigger asChild>
                    <Avatar className="h-10 w-10 md:h-11 md:w-11 cursor-pointer hover:opacity-80 transition-opacity ml-1">
                      {profilePhotoUrl && (
                        <AvatarImage
                          src={profilePhotoUrl}
                          alt={firstName || 'User'}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {firstName ? firstName.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-[85vw] max-w-sm pt-12"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <UserMenuItems />
                  </SheetContent>
                </Sheet>
              ) : (
                <Popover open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
                  <PopoverTrigger asChild>
                    <Avatar className="h-10 w-10 md:h-11 md:w-11 cursor-pointer hover:opacity-80 transition-opacity ml-1">
                      {profilePhotoUrl && (
                        <AvatarImage
                          src={profilePhotoUrl}
                          alt={firstName || 'User'}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {firstName ? firstName.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    className="w-56 p-2 bg-card border border-border rounded-lg shadow-lg animate-in fade-in duration-200 slide-in-from-top-1"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <UserMenuItems />
                  </PopoverContent>
                </Popover>
              )
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/login')}
                className="ml-1"
              >
                <User className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="relative group hover:bg-primary/10 transition-colors"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="w-5 h-5 group-hover:text-primary transition-colors" />
              {totalItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-in zoom-in border-2 border-background">
                  {totalItemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        onSuccess={() => setShowChangePassword(false)}
      />
    </>
  )
}
