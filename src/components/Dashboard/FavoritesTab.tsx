import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { HeartOff, AlertCircle, ShoppingCart, Trash2, Heart, Loader2 } from 'lucide-react'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/contexts/AuthContext'
import { customerService } from '@/services/customerService'

type Product = { id: string; name: string; price_usd: number; image_url: string }
type FavoriteItem = { id: string; product_id: string; product: Product }

const playCoinSound = () => {
  const a = new Audio('/sounds/coin-drop.mp3')
  a.volume = 0.6
  a.play().catch(() => {
    try {
      const C = window.AudioContext || (window as any).webkitAudioContext
      if (!C) return
      const c = new C(),
        o = c.createOscillator(),
        g = c.createGain()
      o.connect(g)
      g.connect(c.destination)
      o.frequency.setValueAtTime(800, c.currentTime)
      o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.1)
      g.gain.setValueAtTime(0, c.currentTime)
      g.gain.linearRampToValueAtTime(0.5, c.currentTime + 0.05)
      g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5)
      o.start(c.currentTime)
      o.stop(c.currentTime + 0.5)
    } catch (e) {
      // ignore audio context errors
    }
  })
}

const createHeartParticles = (e: React.MouseEvent<HTMLButtonElement>) => {
  const r = e.currentTarget.getBoundingClientRect(),
    x = r.left + r.width / 2,
    y = r.top + r.height / 2
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div')
    p.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-red-500 w-4 h-4"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:all 0.6s cubic-bezier(0.2,0.8,0.2,1);opacity:1`
    document.body.appendChild(p)
    const a = Math.random() * Math.PI * 2,
      v = 40 + Math.random() * 80,
      tx = Math.cos(a) * v,
      ty = Math.sin(a) * v - 40
    requestAnimationFrame(() => {
      p.style.transform = `translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) scale(0.5)`
      p.style.opacity = '0'
    })
    setTimeout(() => p.remove(), 600)
  }
}

function FavoriteCard({
  item,
  customerId,
  onOptimisticRemove,
}: {
  item: FavoriteItem
  customerId: string
  onOptimisticRemove: (id: string) => void
}) {
  const { currentUser: user } = useAuthContext()
  const { toast } = useToast()
  const [isFavorited, setIsFavorited] = useState(true)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [showQtyModal, setShowQtyModal] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const executeRemove = async () => {
    setIsFadingOut(true)
    onOptimisticRemove(item.id)
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user!.id)
        .eq('product_id', item.product_id)
      if (error) throw error
    } catch (e) {
      toast({ description: 'Erro ao remover dos favoritos', variant: 'destructive' })
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFavorited) {
      setIsFavorited(false)
      toast({ description: 'Removido dos favoritos' })
      await executeRemove()
    } else {
      playCoinSound()
      createHeartParticles(e)
      setIsFavorited(true)
      try {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user!.id, product_id: item.product_id })
        if (error) throw error
      } catch (err) {
        setIsFavorited(false)
        toast({ description: 'Erro ao adicionar aos favoritos', variant: 'destructive' })
      }
    }
  }

  const handleRemoveBtn = async () => {
    setIsRemoving(true)
    toast({ description: 'Removido dos favoritos' })
    await executeRemove()
  }

  const handleAddToCart = async () => {
    setIsAddingToCart(true)
    try {
      await customerService.addToCart(customerId, item.product_id, quantity)
      toast({ description: 'Movido para o carrinho!' })
      setShowQtyModal(false)
      await executeRemove()
    } catch (e) {
      setIsAddingToCart(false)
      toast({ description: 'Erro ao adicionar ao carrinho', variant: 'destructive' })
    }
  }

  return (
    <>
      <Card
        className={cn(
          'flex flex-col h-full overflow-hidden group border-border/50 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md relative',
          isFadingOut && 'opacity-0 -translate-y-3 pointer-events-none',
        )}
      >
        <CardHeader className="p-0 relative">
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm bg-white/80 hover:bg-white backdrop-blur-sm transition-all overflow-visible"
              onClick={handleToggleFavorite}
              disabled={isRemoving || isAddingToCart}
            >
              {isFavorited ? (
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              ) : (
                <Heart className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <Link
            to={`/product/${item.product_id}`}
            className="w-full h-[200px] overflow-hidden bg-muted/30 flex items-center justify-center"
          >
            <ImageWithFallback
              src={item.product.image_url}
              alt={item.product.name}
              productId={item.product_id}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        </CardHeader>
        <CardContent className="flex-1 p-5 flex flex-col">
          <Link to={`/product/${item.product_id}`} className="mb-2">
            <h3 className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors line-clamp-3 h-[60px] md:h-[72px]">
              {item.product.name}
            </h3>
          </Link>
          <div className="mt-auto pt-1 font-bold text-green-600 text-lg">
            US${' '}
            {item.product.price_usd?.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </CardContent>
        <CardFooter className="p-5 pt-0 mt-auto gap-2 flex flex-col">
          <Button
            onClick={() => setShowQtyModal(true)}
            disabled={isRemoving || isAddingToCart}
            className="w-full bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-[1.02] shadow-sm"
          >
            {isAddingToCart ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4 mr-2" />
            )}
            Adicionar
          </Button>
          <Button
            onClick={handleRemoveBtn}
            disabled={isRemoving || isAddingToCart}
            variant="destructive"
            className="w-full transition-all hover:scale-[1.02] shadow-sm"
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Remover
          </Button>
        </CardFooter>
      </Card>
      <Dialog open={showQtyModal} onOpenChange={setShowQtyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar ao Carrinho</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQtyModal(false)}
              disabled={isAddingToCart}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAddingToCart ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function FavoritesTab({
  customerId,
}: {
  favorites?: any[]
  customerId: string
  onRefresh?: () => void
}) {
  const { currentUser: user } = useAuthContext()
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    setError(false)
    try {
      const { data, error: err } = await supabase
        .from('favorites')
        .select(`id, product_id, products (id, name, price_usd, image_url)`)
        .eq('user_id', user.id)
      if (err) throw err
      const formatted = (data as any[])
        .map((d) => ({ id: d.id, product_id: d.product_id, product: d.products }))
        .filter((d) => d.product)
      setItems(formatted)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) fetchFavorites()
  }, [user, fetchFavorites])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('favorites_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` },
        () => fetchFavorites(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchFavorites])

  const visibleItems = items.filter((item) => !optimisticRemovedIds.has(item.id))

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5].map((i, index) => (
          <div
            key={i}
            className="flex flex-col h-full bg-card border rounded-lg overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Skeleton className="h-[200px] w-full rounded-none" />
            <div className="p-5 flex flex-col flex-1 gap-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3 mt-auto pt-1" />
            </div>
            <div className="p-5 pt-0 mt-auto flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg animate-fade-in">
        <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">Erro ao carregar favoritos</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Não foi possível carregar seus favoritos. Tente novamente.
        </p>
        <Button onClick={fetchFavorites} variant="outline">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg animate-fade-in">
        <HeartOff className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">Nenhum favorito ainda</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Você não adicionou nenhum produto aos favoritos. Explore nosso catálogo e salve seus
          produtos preferidos aqui!
        </p>
        <Button onClick={() => navigate('/search')}>Explorar Produtos</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {visibleItems.map((item, index) => (
        <div
          key={item.id}
          className="animate-fade-in"
          style={{ animationDelay: `${(index % 10) * 50}ms` }}
        >
          <FavoriteCard
            item={item}
            customerId={customerId}
            onOptimisticRemove={(id) => {
              setOptimisticRemovedIds((prev) => new Set(prev).add(id))
              setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 300)
            }}
          />
        </div>
      ))}
    </div>
  )
}
