import { CartItem } from '@/types/customer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Trash2,
  ShoppingCart,
  AlertCircle,
  Heart,
  Minus,
  Plus,
  Zap,
  MessageCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { ProductPrice } from '@/components/ProductPrice'
import { useMultipleProductDiscounts } from '@/hooks/useProductDiscount'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useCart } from '@/hooks/useCart'
import { cn } from '@/lib/utils'

export function CartTab({
  cart: propsCart,
  customerId,
  onRefresh: propsOnRefresh,
}: {
  cart: CartItem[]
  customerId: string
  onRefresh: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const cartContext = useCart() as any
  const globalRefresh =
    cartContext?.refreshCart ||
    cartContext?.fetchCart ||
    cartContext?.loadCart ||
    cartContext?.fetchCartItems

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [removingIds, setRemovingIds] = useState<string[]>([])

  const fetchCart = async () => {
    if (!user) return
    try {
      const { data, error: fetchErr } = await supabase
        .from('cart_items')
        .select(`id, quantity, product_id, products (*)`)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setItems(data || [])
      setError(false)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCart()

    if (!user) return

    const channel = supabase
      .channel('dashboard_cart_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCart()
          if (globalRefresh) globalRefresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const executeWithAnimation = async (id: string, action: () => Promise<void>) => {
    if (processing) return
    setProcessing(id)
    setRemovingIds((prev) => [...prev, id])

    // Wait for the fade-out animation to complete
    await new Promise((res) => setTimeout(res, 300))

    try {
      await action()
      if (globalRefresh) globalRefresh()
      if (propsOnRefresh) propsOnRefresh()
    } catch (e) {
      // Revert animation on error
      setRemovingIds((prev) => prev.filter((i) => i !== id))
    } finally {
      setProcessing(null)
    }
  }

  const handleRemove = (id: string) => {
    executeWithAnimation(id, async () => {
      const { error } = await supabase.from('cart_items').delete().eq('id', id)
      if (error) throw error
      toast.success('Item removido do carrinho')
    })
  }

  const handleMoveToFavorites = (item: any) => {
    executeWithAnimation(item.id, async () => {
      const { error: favError } = await supabase
        .from('favorites')
        .insert({ user_id: user!.id, product_id: item.product_id })

      if (favError && favError.code !== '23505') throw favError

      const { error: rmError } = await supabase.from('cart_items').delete().eq('id', item.id)
      if (rmError) throw rmError

      toast.success('Movido para favoritos!')
    })
  }

  const handleUpdateQty = async (id: string, newQty: number) => {
    if (newQty < 1 || processing) return
    setProcessing(`qty-${id}`)
    try {
      const { error } = await supabase.from('cart_items').update({ quantity: newQty }).eq('id', id)
      if (error) throw error
      if (globalRefresh) globalRefresh()
      if (propsOnRefresh) propsOnRefresh()
    } catch (e) {
      toast.error('Erro ao atualizar quantidade')
    } finally {
      setProcessing(null)
    }
  }

  const products = items.map((item) => item.products).filter(Boolean)
  const { discounts } = useMultipleProductDiscounts(products)

  let subtotal = 0
  items.forEach((item) => {
    const p = item.products
    if (!p) return
    const discountedPrice = discounts[p.id]?.discountedPrice ?? p.price_usd ?? 0
    subtotal += discountedPrice * item.quantity
  })

  if (loading) {
    return (
      <div className="w-full h-auto py-6 px-4 bg-transparent overflow-visible flex flex-col gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-full p-4 border border-border rounded-lg bg-card">
            <div className="flex gap-4 mb-4">
              <Skeleton className="w-[80px] h-[80px] rounded-[4px] shrink-0" />
              <div className="flex-1 space-y-2 py-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
            <div className="flex flex-row gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center w-full h-auto bg-transparent overflow-visible animate-in fade-in duration-300">
        <AlertCircle className="w-[48px] h-[48px] text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2 text-foreground">Erro ao carregar carrinho</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Nao foi possivel carregar seu carrinho. Tente novamente.
        </p>
        <Button className="w-full sm:w-auto" onClick={fetchCart}>
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full h-auto py-6 px-4 bg-transparent overflow-visible">
      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center w-full h-auto bg-transparent overflow-visible animate-in fade-in duration-300">
            <div className="relative mb-4 opacity-50 text-muted-foreground">
              <ShoppingCart className="w-[48px] h-[48px]" />
              <div className="absolute top-1/2 left-[-20%] right-[-20%] h-[3px] bg-muted-foreground -rotate-45" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Seu carrinho esta vazio</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Adicione produtos ao carrinho para continuar.
            </p>
            <Button className="w-full sm:w-auto" onClick={() => navigate('/products')}>
              Explorar Produtos
            </Button>
          </div>
        ) : (
          items.map((item, index) => {
            const p = item.products
            if (!p) return null
            const isProcessing = processing === item.id || processing === `qty-${item.id}`
            const isRemoving = removingIds.includes(item.id)

            return (
              <div
                key={item.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn(
                  'w-full p-4 border border-border rounded-lg bg-card transition-all duration-300',
                  isRemoving ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0',
                  'animate-in fade-in slide-in-from-bottom-4 fill-mode-both',
                )}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-5">
                  <div className="flex items-center gap-5 flex-1">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/product/${p.id}`)}
                      />
                    ) : (
                      <div
                        className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/product/${p.id}`)}
                      >
                        <span className="text-xs font-medium text-slate-400">Sem Foto</span>
                      </div>
                    )}
                    <div>
                      <p
                        className="font-bold text-slate-900 line-clamp-2 text-lg leading-tight mb-1 cursor-pointer hover:text-[hsl(152,68%,40%)] transition-colors"
                        onClick={() => navigate(`/product/${p.id}`)}
                      >
                        {p.name}
                      </p>
                      <div className="mt-1 text-sm text-slate-500 font-medium font-mono">
                        <ProductPrice
                          originalPrice={p.price_usd}
                          discountedPrice={discounts[p.id]?.discountedPrice}
                          weight={p.weight}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                    <div className="flex items-center border border-[hsl(215,20%,90%)] rounded-lg overflow-hidden bg-[hsl(215,20%,96%)]">
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        disabled={isProcessing || item.quantity <= 1}
                        className="px-4 py-2 hover:bg-[hsl(215,20%,90%)] transition-colors text-[hsl(215,25%,15%)] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(215,25%,15%)] disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 border-x border-[hsl(215,20%,90%)] font-semibold text-[hsl(215,25%,15%)] min-w-[3.5rem] text-center bg-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        disabled={isProcessing}
                        className="px-4 py-2 hover:bg-[hsl(215,20%,90%)] transition-colors text-[hsl(215,25%,15%)] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(215,25%,15%)] disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right w-28">
                      <p className="font-bold text-slate-900 font-mono text-lg tracking-tight">
                        $
                        {(
                          (discounts[p.id]?.discountedPrice ?? p.price_usd ?? 0) * item.quantity
                        ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={isProcessing}
                        onClick={() => handleMoveToFavorites(item)}
                        className="p-2.5 text-slate-400 hover:text-pink-500 hover:bg-pink-50 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"
                        title="Mover para Favoritos"
                      >
                        <Heart className="w-5 h-5" />
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => handleRemove(item.id)}
                        className="p-2.5 text-[hsl(0,84%,60%)] hover:bg-red-50 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(0,84%,60%)]"
                        title="Remover"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-foreground font-bold">
            <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} itens)</span>
            <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-4 border-t border-border text-foreground">
            <span>Total Estimado</span>
            <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-sm text-muted-foreground">Impostos e frete calculados no checkout.</p>
        </div>
        <div className="flex flex-col gap-4 w-full mt-4">
          {items.length === 0 && (
            <p className="text-sm font-medium text-center text-muted-foreground mt-2">
              Adicione itens ao carrinho para continuar.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <button
              disabled={items.length === 0}
              onClick={() => navigate('/checkout?mode=automatizado')}
              className={cn(
                'flex flex-col items-center justify-center text-center p-4 rounded-xl min-h-[80px] transition-all duration-200 border-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(210,100%,50%)]',
                'bg-[hsl(210,100%,50%)] text-white',
                items.length > 0
                  ? 'hover:bg-[hsl(210,100%,45%)] hover:shadow-md active:scale-[0.98] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed',
              )}
            >
              <Zap className="w-6 h-6 mb-2 text-white" />
              <span className="font-bold text-base leading-tight text-white">
                Checkout Automatizado
              </span>
              <span className="text-sm text-white/90 mt-1 font-normal">
                Finalize sua compra em 2 minutos
              </span>
            </button>

            <button
              disabled={items.length === 0}
              onClick={() => navigate('/checkout?mode=especialista')}
              className={cn(
                'flex flex-col items-center justify-center text-center p-4 rounded-xl min-h-[80px] transition-all duration-200 border-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(152,68%,40%)]',
                'bg-[hsl(152,68%,40%)] text-white',
                items.length > 0
                  ? 'hover:bg-[hsl(152,68%,35%)] hover:shadow-md active:scale-[0.98] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed',
              )}
            >
              <MessageCircle className="w-6 h-6 mb-2 text-white" />
              <span className="font-bold text-base leading-tight text-white">
                Checkout com Especialista
              </span>
              <span className="text-sm text-white/90 mt-1 font-normal">
                Checkout com atendente humano
              </span>
            </button>
          </div>
          <Button
            variant="outline"
            className="w-full h-12 text-lg hover:scale-[1.02] hover:shadow-md transition-all duration-200 mt-2"
            onClick={() => navigate('/products')}
          >
            Continuar Comprando
          </Button>
        </div>
      </div>
    </div>
  )
}
