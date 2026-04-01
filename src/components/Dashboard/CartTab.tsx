import { CartItem } from '@/types/customer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ShoppingCart, Eye, Minus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { customerService } from '@/services/customerService'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { ProductPrice } from '@/components/ProductPrice'
import { useMultipleProductDiscounts } from '@/hooks/useProductDiscount'
import { useCart } from '@/hooks/useCart'

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
  const [processing, setProcessing] = useState<string | null>(null)

  const cartContext = useCart() as any
  const globalCart = cartContext?.cart || cartContext?.items || cartContext?.cartItems
  const globalRefresh =
    cartContext?.refreshCart ||
    cartContext?.fetchCart ||
    cartContext?.loadCart ||
    cartContext?.fetchCartItems

  const activeCart =
    Array.isArray(globalCart) && globalCart.length > 0
      ? globalCart
      : Array.isArray(propsCart) && propsCart.length > 0
        ? propsCart
        : Array.isArray(globalCart)
          ? globalCart
          : []

  useEffect(() => {
    if (globalRefresh) globalRefresh()
    if (propsOnRefresh) propsOnRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemove = async (cartItemId: string) => {
    try {
      setProcessing(cartItemId)
      await customerService.removeFromCart(cartItemId)
      toast.success('Item removido do carrinho')
      if (globalRefresh) globalRefresh()
      if (propsOnRefresh) propsOnRefresh()
    } catch (e) {
      toast.error('Erro ao remover item. Tente novamente.')
    } finally {
      setProcessing(null)
    }
  }

  const handleUpdateQty = async (cartItemId: string, newQty: number) => {
    if (newQty < 1) return
    try {
      setProcessing(`qty-${cartItemId}`)
      await customerService.updateCartQuantity(cartItemId, newQty)
      if (globalRefresh) globalRefresh()
      if (propsOnRefresh) propsOnRefresh()
    } catch (e) {
      toast.error('Erro ao atualizar quantidade.')
    } finally {
      setProcessing(null)
    }
  }

  const products = activeCart.map((item: any) => item.products || item.product).filter(Boolean)
  const { discounts } = useMultipleProductDiscounts(products)

  let subtotal = 0
  let totalDiscountAmount = 0

  activeCart.forEach((item: any) => {
    const p = item.products || item.product
    if (!p) return
    const d = discounts[p.id]
    subtotal += (p.price_usd || 0) * item.quantity
    if (d?.discountAmount) {
      totalDiscountAmount += d.discountAmount * item.quantity
    }
  })

  const discount = totalDiscountAmount
  const total = subtotal - discount

  if (activeCart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg animate-fade-in">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">Seu carrinho está vazio</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Você não possui nenhum item no carrinho. Comece a comprar agora!
        </p>
        <Button onClick={() => navigate('/search')}>Continuar Comprando</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-4">
        {activeCart.map((item: any) => {
          const product = item.products || item.product
          if (!product) return null
          const isProcessing = processing === item.id || processing === `qty-${item.id}`

          return (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                <div
                  className="w-24 h-24 bg-muted rounded-md shrink-0 p-2 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-grow text-center sm:text-left">
                  <h4
                    className="font-semibold line-clamp-2 hover:text-primary cursor-pointer transition-colors"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {product.name}
                  </h4>
                  <div className="mt-2">
                    <ProductPrice
                      originalPrice={product.price_usd}
                      discountedPrice={discounts[product.id]?.discountedPrice}
                      weight={product.weight}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
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
                        (discounts[product.id]?.discountedPrice ?? product.price_usd ?? 0) *
                        item.quantity
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4 w-full sm:w-auto justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Ver detalhes"
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remover"
                    onClick={() => handleRemove(item.id)}
                    disabled={isProcessing}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-primary/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 border-b border-border pb-4">Resumo do Pedido</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({activeCart.reduce((a, b) => a + b.quantity, 0)} itens)</span>
                <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Descontos</span>
                  <span>-${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-4 border-t border-border">
                <span>Total</span>
                <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <Button
              className="w-full h-12 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate('/checkout')}
            >
              Ir para Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
