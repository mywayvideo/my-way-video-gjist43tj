import { CartItem } from '@/types/customer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, ShoppingCart, AlertCircle, Heart, Zap, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { useMultipleProductDiscounts } from '@/hooks/useProductDiscount'
import { useAuthContext } from '@/contexts/AuthContext'
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
  const { currentUser: user } = useAuthContext()

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
      <div className="w-full h-auto py-6 bg-transparent flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48 mb-4" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-full h-32 rounded-2xl" />
          ))}
        </div>
        <div className="w-full lg:w-[400px] shrink-0">
          <Skeleton className="w-full h-[400px] rounded-2xl" />
        </div>
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
    <div className="w-full h-auto py-6 bg-transparent">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Items */}
        <div className="flex-1 flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-foreground mb-2">Meu Carrinho</h2>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center w-full bg-card rounded-2xl border border-border animate-in fade-in duration-300">
              <div className="relative mb-4 opacity-50 text-muted-foreground">
                <ShoppingCart className="w-[48px] h-[48px]" />
                <div className="absolute top-1/2 left-[-20%] right-[-20%] h-[3px] bg-muted-foreground -rotate-45" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Seu carrinho esta vazio</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Adicione produtos ao carrinho para continuar.
              </p>
              <Button className="w-full sm:w-auto rounded-xl" onClick={() => navigate('/products')}>
                Explorar Produtos
              </Button>
            </div>
          ) : (
            items.map((item, index) => {
              const p = item.products
              if (!p) return null
              const isProcessing = processing === item.id || processing === `qty-${item.id}`
              const isRemoving = removingIds.includes(item.id)
              const unitPrice = discounts[p.id]?.discountedPrice ?? p.price_usd ?? 0

              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={cn(
                    'w-full p-4 sm:p-5 border border-border rounded-2xl bg-card flex flex-col sm:flex-row gap-5 transition-all duration-300',
                    isRemoving ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0',
                    'animate-in fade-in slide-in-from-bottom-4 fill-mode-both',
                  )}
                >
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center p-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/product/${p.id}`)}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">Sem Foto</span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h4
                          className="font-bold text-lg text-foreground leading-tight mb-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/product/${p.id}`)}
                        >
                          {p.name}
                        </h4>
                        <p className="text-muted-foreground text-base">
                          ${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-border rounded-full h-9 bg-transparent">
                            <button
                              onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                              disabled={isProcessing || item.quantity <= 1}
                              className="w-9 h-full flex items-center justify-center text-foreground hover:bg-muted transition-colors rounded-l-full disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                              disabled={isProcessing}
                              className="w-9 h-full flex items-center justify-center text-foreground hover:bg-muted transition-colors rounded-r-full disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-bold text-xl text-foreground whitespace-nowrap min-w-[80px] text-right">
                            $
                            {(unitPrice * item.quantity).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleMoveToFavorites(item)}
                            className="flex items-center px-4 h-9 border border-border rounded-full text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            <Heart className="w-4 h-4 mr-2" />
                            Mover para Favoritos
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleRemove(item.id)}
                            className="flex items-center justify-center w-9 h-9 border border-border rounded-full text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Summary */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="p-6 border border-border rounded-2xl bg-card sticky top-6">
            <h3 className="text-xl font-bold text-foreground mb-6">Resumo</h3>

            <div className="flex justify-between text-muted-foreground mb-6 text-base">
              <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} itens)</span>
              <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between font-bold text-foreground items-center mb-8">
              <span className="text-xl">Total Estimado</span>
              <span className="text-2xl">
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <p className="text-sm text-center text-muted-foreground mb-6">
              Preço final calculado no checkout.
            </p>

            <p className="text-sm text-center text-muted-foreground mb-4">2 opcoes de checkout</p>

            <div className="flex flex-col gap-3">
              {items.length === 0 && (
                <p className="text-sm font-medium text-center text-destructive mb-1">
                  Adicione itens ao carrinho para continuar.
                </p>
              )}

              <button
                disabled={items.length === 0}
                onClick={() => navigate('/checkout?mode=automatizado')}
                className={cn(
                  'flex items-center p-4 rounded-xl min-h-[80px] transition-all duration-200 border-none outline-none',
                  'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
                  items.length === 0 && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center justify-center w-10 h-10 shrink-0">
                  <Zap className="w-5 h-5" fill="currentColor" />
                </div>
                <div className="flex flex-col items-start ml-2 text-left">
                  <span className="font-bold text-base leading-tight mb-1">
                    Checkout Automatizado
                  </span>
                  <span className="text-sm text-white/90 font-normal leading-tight">
                    Finalize sua compra em 2 minutos
                  </span>
                </div>
              </button>

              <button
                disabled={items.length === 0}
                onClick={() => navigate('/checkout?mode=especialista')}
                className={cn(
                  'flex items-center p-4 rounded-xl min-h-[80px] transition-all duration-200 border-none outline-none',
                  'bg-[#22c55e] text-white hover:bg-[#16a34a]',
                  items.length === 0 && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center justify-center w-10 h-10 shrink-0">
                  <MessageCircle className="w-5 h-5" fill="currentColor" />
                </div>
                <div className="flex flex-col items-start ml-2 text-left">
                  <span className="font-bold text-base leading-tight mb-1">
                    Checkout com Especialista
                  </span>
                  <span className="text-sm text-white/90 font-normal leading-tight">
                    Checkout com atendente humano
                  </span>
                </div>
              </button>

              <button
                onClick={() => navigate('/products')}
                className="mt-2 w-full h-12 rounded-xl border border-border text-foreground hover:bg-muted font-medium transition-colors"
              >
                Continuar Comprando
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
