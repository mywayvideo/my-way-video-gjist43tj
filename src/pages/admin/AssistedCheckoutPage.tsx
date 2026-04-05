import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Search, ArrowLeft, Trash2, ShoppingCart, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function AssistedCheckoutPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [discountRate, setDiscountRate] = useState(0)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  // Novas states para Cupom e Metodo de Pagamento
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount_amount: number
  } | null>(null)
  const [isGeneratingCoupon, setIsGeneratingCoupon] = useState(false)
  const [couponType, setCouponType] = useState<'fixed' | 'percentage'>('percentage')
  const [couponValue, setCouponValue] = useState<number | ''>('')
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'transfer' | ''>('')
  const [creditCardGateway, setCreditCardGateway] = useState<'stripe' | 'paypal'>('stripe')

  const loadData = async () => {
    if (!customerId) return
    setLoading(true)
    setError(null)
    try {
      const [custRes, prodRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId).single(),
        supabase.from('products').select('*, manufacturers(name)').limit(20),
      ])

      if (custRes.error) throw custRes.error

      setCustomer(custRes.data)
      if (prodRes.data) setProducts(prodRes.data)

      if (custRes.data?.role === 'vip') setDiscountRate(10)
      if (custRes.data?.role === 'reseller') setDiscountRate(15)

      // Load Cart (Directly from cart_items filtering by user_id as previously fixed)
      if (custRes.data?.user_id) {
        const { data: cartItemsData, error: itemsError } = await supabase
          .from('cart_items')
          .select('quantity, products(*, manufacturers(name))')
          .eq('user_id', custRes.data.user_id)

        if (itemsError) throw new Error('Não foi possível carregar os itens do carrinho.')

        if (cartItemsData) {
          const loadedCart = cartItemsData
            .filter((item: any) => item.products)
            .map((item: any) => ({
              product: item.products,
              quantity: item.quantity,
            }))

          const cartMap = new Map()
          loadedCart.forEach((item) => {
            if (cartMap.has(item.product.id)) {
              const existing = cartMap.get(item.product.id)
              existing.quantity += item.quantity
            } else {
              cartMap.set(item.product.id, item)
            }
          })
          setCart(Array.from(cartMap.values()))
        }
      }
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Erro ao carregar dados.')
      toast({
        title: 'Erro',
        description: e.message || 'Erro ao carregar dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [customerId])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = supabase.from('products').select('*, manufacturers(name)').limit(20)
      if (search) q.ilike('name', `%${search}%`)
      const { data } = await q
      if (data) setProducts(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + (item.product.price_usd || 0) * item.quantity,
    0,
  )
  const discount = subtotal * (discountRate / 100)
  const couponDiscountUsd = appliedCoupon ? appliedCoupon.discount_amount : 0
  const totalDiscountUsd = discount + couponDiscountUsd

  const totalUsd = Math.max(0, subtotal - totalDiscountUsd)

  const handleGenerateCoupon = async () => {
    const val = Number(couponValue)
    if (!val || val <= 0) {
      toast({
        title: 'Erro',
        description: 'Valor deve ser maior que zero.',
        variant: 'destructive',
      })
      return
    }

    let discount_amount = val
    if (couponType === 'percentage') {
      if (val > 100) {
        toast({
          title: 'Erro',
          description: 'Percentual não pode ser maior que 100%.',
          variant: 'destructive',
        })
        return
      }
      discount_amount = subtotal * (val / 100)
    }

    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-discount-coupon', {
        body: {
          cartItems: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
          user_id: customer?.user_id,
          discount_amount,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setCouponCode(data.code)
      setAppliedCoupon({ code: data.code, discount_amount: data.discount_amount })
      setIsGeneratingCoupon(false)
      setCouponValue('')
      toast({ title: 'Sucesso', description: 'Cupom gerado com sucesso!' })
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Não foi possível gerar o cupom.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode || couponCode.length < 3) {
      toast({
        title: 'Erro',
        description: 'Digite um código de cupom válido.',
        variant: 'destructive',
      })
      return
    }

    setValidating(true)
    try {
      const { data, error } = await supabase.functions.invoke('validate-discount-coupon', {
        body: { coupon_code: couponCode, subtotal },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setAppliedCoupon({ code: data.code, discount_amount: data.discount_amount })
      toast({ title: 'Sucesso', description: 'Cupom aplicado com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Cupom inválido.', variant: 'destructive' })
      setAppliedCoupon(null)
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    if (!cart.length)
      return toast({ title: 'Erro', description: 'Carrinho vazio.', variant: 'destructive' })
    if (!paymentMethod)
      return toast({
        title: 'Erro',
        description: 'Selecione um método de pagamento.',
        variant: 'destructive',
      })

    setSaving(true)
    try {
      const paymentMethodType =
        paymentMethod === 'credit_card'
          ? creditCardGateway === 'stripe'
            ? 'card'
            : 'paypal'
          : paymentMethod

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          order_number: `ORD-${Date.now().toString().slice(-6)}`,
          status: 'pending',
          subtotal,
          discount_amount: totalDiscountUsd,
          shipping_cost: 0,
          total: totalUsd,
          payment_method_type: paymentMethodType,
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      const items = cart.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price_usd || 0,
        total_price: (i.product.price_usd || 0) * i.quantity,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(items)
      if (itemsErr) throw itemsErr

      if (customer?.user_id) {
        await supabase.from('cart_items').delete().eq('user_id', customer.user_id)
      }

      toast({
        title: 'Sucesso',
        description: `Pedido criado com sucesso para ${customer.full_name || customer.email}!`,
      })
      navigate('/admin/gerenciar-clientes')
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o pedido.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="p-8 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )

  if (error)
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-4 max-w-7xl mx-auto min-h-[50vh]">
        <p className="text-destructive font-bold text-lg">{error}</p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )

  if (!customer)
    return <div className="p-8 text-center text-destructive font-bold">Cliente não encontrado</div>

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/gerenciar-clientes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Checkout Assistido: {customer.full_name || 'Cliente sem nome'}
            <Badge
              variant={customer.role === 'admin' ? 'destructive' : 'default'}
              className="uppercase"
            >
              {customer.role}
            </Badge>
          </h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lado Esquerdo - Produtos */}
        <Card className="flex flex-col h-[75vh] min-h-[600px]">
          <CardHeader className="pb-3">
            <CardTitle>Selecionar Produtos</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-4 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {p.sku || 'N/A'} | {p.manufacturers?.name || 'Genérico'}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      USD {formatCurrency(p.price_usd || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="999"
                      value={quantities[p.id] || 1}
                      onChange={(e) =>
                        setQuantities({ ...quantities, [p.id]: parseInt(e.target.value) || 1 })
                      }
                      className="w-16 h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const qty = quantities[p.id] || 1
                        setCart((prev) =>
                          prev.find((i) => i.product.id === p.id)
                            ? prev.map((i) =>
                                i.product.id === p.id ? { ...i, quantity: i.quantity + qty } : i,
                              )
                            : [...prev, { product: p, quantity: qty }],
                        )
                        setQuantities({ ...quantities, [p.id]: 1 })
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              ))}
              {!products.length && (
                <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado.</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Lado Direito - Resumo do Pedido */}
        <Card className="flex flex-col h-[75vh] min-h-[600px] border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Resumo do Pedido</span>
              <Badge variant="secondary" className="text-sm">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 pt-2 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-muted"
                >
                  <div className="flex-1 pr-4">
                    <p className="font-medium line-clamp-1">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x USD {formatCurrency(item.product.price_usd || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">
                      USD {formatCurrency(item.quantity * (item.product.price_usd || 0))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                      onClick={() => setCart(cart.filter((i) => i.product.id !== item.product.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!cart.length && (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
                  <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm opacity-70">Adicione produtos na lista ao lado.</p>
                </div>
              )}
            </div>

            {/* Cupom de Desconto */}
            <div className="p-4 border rounded-lg bg-card space-y-3 mt-6 mx-6 mb-4">
              <h3 className="font-semibold text-sm">Cupom de Desconto (Opcional)</h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md">
                  <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                    Cupom <span className="font-bold">{appliedCoupon.code}</span> aplicado: -USD{' '}
                    {formatCurrency(appliedCoupon.discount_amount)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-700 hover:text-green-800 hover:bg-green-100"
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponCode('')
                      toast({ description: 'Cupom removido' })
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Digite o código do cupom"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleApplyCoupon}
                      disabled={validating || !couponCode}
                    >
                      {validating ? 'Aplicando...' : 'Aplicar Cupom'}
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setIsGeneratingCoupon(true)}
                    >
                      Gerar Cupom
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Metodo de Pagamento */}
            <div className="p-4 border rounded-lg bg-card space-y-4 mx-6 mb-6">
              <h3 className="font-semibold text-sm">Método de Pagamento</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">Cartão de Crédito</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pix"
                    checked={paymentMethod === 'pix'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">Pix</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={paymentMethod === 'transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">Depósito em Conta</span>
                </label>
              </div>

              {paymentMethod === 'credit_card' && (
                <div className="pl-7 space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Selecione o gateway:
                    </p>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gateway"
                          value="stripe"
                          checked={creditCardGateway === 'stripe'}
                          onChange={(e) => setCreditCardGateway(e.target.value as any)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Stripe</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gateway"
                          value="paypal"
                          checked={creditCardGateway === 'paypal'}
                          onChange={(e) => setCreditCardGateway(e.target.value as any)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">PayPal</span>
                      </label>
                    </div>
                  </div>

                  {creditCardGateway === 'stripe' && (
                    <div className="space-y-3 mt-4">
                      <Input placeholder="Número do Cartão" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="MM/AA" />
                        <Input placeholder="CVC" />
                      </div>
                      <Input placeholder="Nome no Cartão" />
                    </div>
                  )}

                  {creditCardGateway === 'paypal' && (
                    <div className="p-3 mt-4 bg-muted/50 rounded-md border text-sm text-muted-foreground">
                      Você será redirecionado para PayPal
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'pix' && (
                <div className="pl-7 space-y-1 animate-in slide-in-from-top-2 text-sm text-muted-foreground">
                  <p>• Cliente receberá link para confirmar pagamento via Pix</p>
                  <p>• Dados Pix serão enviados por email</p>
                </div>
              )}

              {paymentMethod === 'transfer' && (
                <div className="pl-7 space-y-1 animate-in slide-in-from-top-2 text-sm text-muted-foreground">
                  <p>• Cliente receberá link para confirmar pagamento</p>
                  <p>• Dados bancários serão enviados por email</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-muted/10 space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal:</span>
              <span>USD {formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Desconto ({discountRate}%):</span>
                <span>- USD {formatCurrency(discount)}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Desconto Cupom:</span>
                <span>- USD {formatCurrency(appliedCoupon.discount_amount)}</span>
              </div>
            )}
            <div className="w-full h-px bg-border my-2" />
            <div className="flex justify-between font-bold text-xl pt-1">
              <span>Total:</span>
              <span className="text-primary">USD {formatCurrency(totalUsd)}</span>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/admin/gerenciar-clientes')}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving || !cart.length || !paymentMethod}
              >
                {saving ? 'Salvando...' : 'Salvar Pedido'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {isGeneratingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md animate-in zoom-in-95">
            <CardHeader>
              <CardTitle>Gerar Cupom de Desconto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={couponType === 'percentage'}
                    onChange={() => setCouponType('percentage')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">Percentual (%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={couponType === 'fixed'}
                    onChange={() => setCouponType('fixed')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">Valor Fixo (USD)</span>
                </label>
              </div>
              <Input
                type="number"
                value={couponValue}
                onChange={(e) => setCouponValue(e.target.value ? Number(e.target.value) : '')}
                placeholder={
                  couponType === 'percentage' ? 'Valor em % (ex: 10)' : 'Valor em USD (ex: 50.00)'
                }
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsGeneratingCoupon(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateCoupon} disabled={generating || !couponValue}>
                {generating ? 'Gerando...' : 'Gerar Cupom'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
