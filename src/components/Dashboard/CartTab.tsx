import { CartItem } from '@/types/customer'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4 flex gap-4">
            <Skeleton className="w-24 h-24 rounded-md shrink-0" />
            <div className="flex-1 space-y-2 py-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg animate-in fade-in duration-300">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-medium mb-2">Erro ao carregar carrinho</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Nao foi possivel carregar seu carrinho. Tente novamente.
        </p>
        <Button onClick={fetchCart}>Tentar Novamente</Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg animate-in fade-in duration-300">
        <div className="relative mb-4 opacity-50 text-muted-foreground">
          <ShoppingCart className="w-12 h-12" />
          <div className="absolute top-1/2 left-[-20%] right-[-20%] h-[3px] bg-muted-foreground -rotate-45" />
        </div>
        <h3 className="text-xl font-medium mb-2">Seu carrinho esta vazio</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Adicione produtos ao carrinho para continuar.
        </p>
        <Button onClick={() => navigate('/products')}>Explorar Produtos</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item, index) => {
          const p = item.products
          if (!p) return null
          const isProcessing = processing === item.id || processing === `qty-${item.id}`
          const isRemoving = removingIds.includes(item.id)

          return (
            <Card
              key={item.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className={cn(
                'overflow-hidden transition-all duration-300',
                isRemoving ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0',
                'animate-in fade-in slide-in-from-bottom-4 fill-mode-both',
              )}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                <div
                  className="w-24 h-24 bg-muted rounded-md shrink-0 p-2 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/product/${p.id}`)}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                  ) : (
                    <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-grow text-center sm:text-left w-full sm:w-auto">
                  <h4
                    className="font-semibold line-clamp-2 hover:text-primary cursor-pointer transition-colors"
                    onClick={() => navigate(`/product/${p.id}`)}
                  >
                    {p.name}
                  </h4>
                  <div className="mt-2">
                    <ProductPrice
                      originalPrice={p.price_usd}
                      discountedPrice={discounts[p.id]?.discountedPrice}
                      weight={p.weight}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center border border-border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      disabled={isProcessing || item.quantity <= 1}
                      onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      disabled={isProcessing}
                      onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-right w-24">
                    <p className="font-bold">
                      $
                      {(
                        (discounts[p.id]?.discountedPrice ?? p.price_usd ?? 0) * item.quantity
                      ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4 w-full sm:w-auto justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleMoveToFavorites(item)}
                    className="w-full sm:w-auto justify-start hover:scale-[1.02] hover:shadow-md transition-all duration-200"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Mover para Favoritos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleRemove(item.id)}
                    className="w-full sm:w-auto justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 hover:scale-[1.02] hover:shadow-md transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-primary/20 animate-in fade-in duration-500">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 border-b border-border pb-4">Resumo do Pedido</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} itens)</span>
                <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 border-t border-border">
                <span>Total Estimado</span>
                <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Impostos e frete calculados no checkout.
              </p>
            </div>
            <div className="space-y-3">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
