import { CartItem } from '@/types/customer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, ShoppingCart, AlertCircle, Heart, Minus, Plus } from 'lucide-react'
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

  if (items.length === 0) {
    return (
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
    )
  }

  return (
    <div className="w-full h-auto py-6 px-4 bg-transparent overflow-visible">
      <div className="flex flex-col gap-4">
        {items.map((item, index) => {
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div
                  className="w-[80px] h-[80px] rounded-[4px] shrink-0 p-2 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity bg-muted"
                  onClick={() => navigate(`/product/${p.id}`)}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                  ) : (
                    <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                  )}
                </div>

                <div className="flex-1 pl-0 sm:pl-4">
                  <h4
                    className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={() => navigate(`/product/${p.id}`)}
                  >
                    {p.name}
                  </h4>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <ProductPrice
                      originalPrice={p.price_usd}
                      discountedPrice={discounts[p.id]?.discountedPrice}
                      weight={p.weight}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-auto flex flex-row items-center justify-between sm:justify-end gap-4 mt-4 sm:mt-0">
                  <div className="flex flex-row items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isProcessing || item.quantity <= 1}
                      onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isProcessing}
                      onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      $
                      {(
                        (discounts[p.id]?.discountedPrice ?? p.price_usd ?? 0) * item.quantity
                      ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-row gap-2 mt-3 sm:mt-4">
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => handleMoveToFavorites(item)}
                  className="flex-1 h-10 text-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Mover para Favoritos
                </Button>
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => handleRemove(item.id)}
                  className="flex-1 h-10 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 hover:scale-[1.02] hover:shadow-md transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          )
        })}
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
        <div className="flex flex-col gap-3 w-full">
          <Button
            className="w-full h-12 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] hover:shadow-md transition-all duration-200"
            onClick={() => navigate('/checkout')}
          >
            Ir para Checkout
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-lg hover:scale-[1.02] hover:shadow-md transition-all duration-200"
            onClick={() => navigate('/products')}
          >
            Continuar Comprando
          </Button>
        </div>
      </div>
    </div>
  )
}
