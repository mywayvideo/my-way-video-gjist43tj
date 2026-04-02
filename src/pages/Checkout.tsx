import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, Landmark, Smartphone, Trash2, CheckCircle2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export default function Checkout() {
  const { user, loading } = useAuth()
  const cartContext = useCart() as any
  const { toast } = useToast()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [subtotal, setSubtotal] = useState(0)

  const [deliveryMethod, setDeliveryMethod] = useState('')
  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zip_code: '',
  })
  const [freight, setFreight] = useState<number | null>(null)

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)

  const [paymentMethod, setPaymentMethod] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [showManualPaymentDialog, setShowManualPaymentDialog] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [orderConfirmed, setOrderConfirmed] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      toast({ description: 'Por favor, faça login para continuar', variant: 'destructive' })
      navigate('/login?redirect=/checkout')
      return
    }
    loadCart()
  }, [user, loading, cartContext])

  const loadCart = () => {
    try {
      let itemsArray = cartContext?.items || cartContext?.cartItems || cartContext?.cart || []

      if (!itemsArray || itemsArray.length === 0) {
        const keys = ['cart', 'shopping-cart', 'cart-storage', 'cartItems']
        for (const key of keys) {
          const local = localStorage.getItem(key)
          if (local) {
            const parsed = JSON.parse(local)
            if (Array.isArray(parsed)) itemsArray = parsed
            else if (parsed && Array.isArray(parsed.items)) itemsArray = parsed.items
            else if (parsed && parsed.state && Array.isArray(parsed.state.items))
              itemsArray = parsed.state.items
            else if (parsed && parsed.state && Array.isArray(parsed.state.cartItems))
              itemsArray = parsed.state.cartItems
            else if (parsed && Array.isArray(parsed.cartItems)) itemsArray = parsed.cartItems

            if (itemsArray && itemsArray.length > 0) break
          }
        }
      }

      if (itemsArray && itemsArray.length > 0) {
        const formatted = itemsArray.map((p: any) => {
          const prod = p.product || p
          return {
            id: p.id || prod.id,
            product_id: prod.id || p.product_id || p.id,
            name: prod.name || p.name,
            unit_price: p.unit_price || prod.price_usd || prod.price || p.price_usd || p.price || 0,
            quantity: p.quantity || 1,
            image_url: prod.image_url || p.image_url,
          }
        })

        const currentIds = cartItems.map((i: any) => `${i.id}-${i.quantity}`).join(',')
        const newIds = formatted.map((i: any) => `${i.id}-${i.quantity}`).join(',')

        if (currentIds !== newIds) {
          setCartItems(formatted)
          calculateSubtotal(formatted)
        }
        return
      }

      if (cartItems.length > 0) {
        setCartItems([])
        setSubtotal(0)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const calculateSubtotal = (items: any[]) => {
    const sum = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0)
    setSubtotal(sum)
  }

  const updateQuantity = (index: number, newQtd: number) => {
    if (newQtd < 1) return
    const newItems = [...cartItems]
    newItems[index].quantity = newQtd
    setCartItems(newItems)
    calculateSubtotal(newItems)

    try {
      const item = newItems[index]
      if (cartContext?.updateQuantity) cartContext.updateQuantity(item.id, newQtd)
      else if (cartContext?.updateItemQuantity) cartContext.updateItemQuantity(item.id, newQtd)
      else localStorage.setItem('cart', JSON.stringify(newItems))
    } catch (e) {
      console.error('Error updating cart quantity', e)
    }
  }

  const removeItem = (index: number) => {
    const removedItem = cartItems[index]
    const newItems = cartItems.filter((_, i) => i !== index)
    setCartItems(newItems)
    calculateSubtotal(newItems)

    try {
      if (cartContext?.removeItem) cartContext.removeItem(removedItem.id)
      else if (cartContext?.removeFromCart) cartContext.removeFromCart(removedItem.id)
      else localStorage.setItem('cart', JSON.stringify(newItems))
    } catch (e) {
      console.error('Error removing cart item', e)
    }
  }

  const total = subtotal - discountAmount + (freight || 0)

  const handleCalculateFreight = async () => {
    if (!deliveryMethod) return

    if (deliveryMethod === 'miami') {
      if (!address.street || !address.number) {
        toast({
          description: 'Preencha rua e número para entrega em Miami.',
          variant: 'destructive',
        })
        return
      }
    } else if (deliveryMethod === 'usa' || deliveryMethod === 'brasil') {
      const zip = address.zip_code.replace(/\D/g, '')
      if (!zip || zip.length < 5) {
        toast({
          description:
            deliveryMethod === 'usa'
              ? 'ZIP code inválido (mínimo 5 dígitos).'
              : 'CEP inválido (mínimo 5 dígitos).',
          variant: 'destructive',
        })
        return
      }
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('calculate-freight', {
        body: { delivery_method: deliveryMethod, address, cart_subtotal: subtotal },
      })
      if (error) throw error
      if (data && typeof data.freight === 'number') {
        setFreight(data.freight)
        setCurrentStep(3)
      } else {
        throw new Error('Erro ao calcular frete')
      }
    } catch (err) {
      toast({ description: 'Erro ao calcular frete. Tente novamente.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('validate-discount-coupon', {
        body: { coupon_code: couponCode.trim(), order_id: null, subtotal },
      })

      if (error) throw error

      if (data && data.discount_amount) {
        setDiscountAmount(data.discount_amount)
        setAppliedCoupon(data.code)
        toast({
          description: `Cupom aplicado com sucesso. Desconto: USD ${data.discount_amount.toFixed(2)}`,
        })
      }
    } catch (err: any) {
      const msg = err.context?.error || err.message || 'Erro ao aplicar cupom.'
      toast({ description: msg, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const getDBShippingMethod = (method: string) => {
    if (method === 'coleta') return 'miami_pickup'
    if (method === 'miami' || method === 'usa') return 'usa_cargo'
    if (method === 'brasil') return 'brazil_delivery'
    return 'usa_cargo'
  }

  const getDBPaymentMethod = (method: string) => {
    if (method === 'stripe') return 'card'
    if (method === 'pix') return 'pix'
    return 'transfer'
  }

  const handleConfirmOrder = async () => {
    setIsLoading(true)
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (!customer) throw new Error('Cliente não encontrado')

      let shippingAddressId = null
      if (deliveryMethod !== 'coleta') {
        const { data: addrData } = await supabase
          .from('customer_addresses')
          .insert({
            customer_id: customer.id,
            address_type: 'shipping',
            street: address.street || 'N/A',
            number: address.number || 'S/N',
            complement: address.complement,
            neighborhood: 'N/A',
            city: address.city || (deliveryMethod === 'miami' ? 'Miami' : 'N/A'),
            state: address.state || (deliveryMethod === 'miami' ? 'FL' : 'N/A'),
            zip_code: address.zip_code || '00000',
            country: deliveryMethod === 'brasil' ? 'Brasil' : 'USA',
          })
          .select('id')
          .single()
        if (addrData) shippingAddressId = addrData.id
      }

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          order_number: orderNumber,
          status: 'pending',
          shipping_address_id: shippingAddressId,
          payment_method_type: getDBPaymentMethod(paymentMethod),
          subtotal,
          discount_amount: discountAmount,
          shipping_cost: freight,
          total,
          shipping_method: getDBShippingMethod(deliveryMethod),
        })
        .select('id')
        .single()

      if (orderErr) throw orderErr

      const itemsToInsert = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert)
      if (itemsErr) throw itemsErr

      if (appliedCoupon) {
        await supabase.functions.invoke('apply-discount-coupon', {
          body: { coupon_code: appliedCoupon, order_id: order.id, discount_amount: discountAmount },
        })
      }

      setCreatedOrderId(order.id)

      if (paymentMethod === 'stripe') {
        const { data: stripeData, error: stripeErr } = await supabase.functions.invoke(
          'create-payment-intent',
          {
            body: { order_id: order.id, amount: Math.round(total * 100) },
          },
        )
        if (stripeErr) throw stripeErr
        if (stripeData?.payment_link) {
          if (cartContext?.clearCart) cartContext.clearCart()
          localStorage.removeItem('cart')
          window.location.href = stripeData.payment_link
        }
      } else {
        setShowManualPaymentDialog(true)
      }
    } catch (err: any) {
      toast({ description: 'Erro ao processar pedido. Tente novamente.', variant: 'destructive' })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const completeManualPayment = async () => {
    if (!createdOrderId) return
    setIsLoading(true)
    try {
      await supabase.from('orders').update({ status: 'pending_payment' }).eq('id', createdOrderId)
      if (cartContext?.clearCart) cartContext.clearCart()
      localStorage.removeItem('cart')
      setOrderConfirmed(true)
      setShowManualPaymentDialog(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  if (orderConfirmed) {
    return (
      <div className="container mx-auto py-12 max-w-2xl text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Pedido Confirmado!</h1>
        <p className="text-gray-600 mb-8">
          Seu pedido foi recebido e está aguardando confirmação de pagamento.
        </p>
        <Button onClick={() => navigate('/')}>Voltar à Loja</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Checkout Automatizado</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1 */}
          <Card className={currentStep !== 1 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>1. Revisão do Carrinho</CardTitle>
            </CardHeader>
            {currentStep === 1 && (
              <CardContent className="space-y-4">
                {cartItems.length === 0 ? (
                  <p>Seu carrinho está vazio.</p>
                ) : (
                  cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded" />
                        )}
                        <div>
                          <p className="font-medium line-clamp-2">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            USD {item.unit_price.toFixed(2)} un.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center border rounded">
                          <button
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            className="px-3 py-1 hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 border-x">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            className="px-3 py-1 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-bold w-24 text-right">
                          USD {(item.unit_price * item.quantity).toFixed(2)}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => navigate('/cart')}>
                    Editar Carrinho
                  </Button>
                  <Button onClick={() => setCurrentStep(2)} disabled={cartItems.length === 0}>
                    Continuar para Entrega
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* STEP 2 */}
          <Card className={currentStep !== 2 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>2. Seleção de Entrega</CardTitle>
            </CardHeader>
            {currentStep === 2 && (
              <CardContent className="space-y-6">
                <RadioGroup
                  value={deliveryMethod}
                  onValueChange={setDeliveryMethod}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div
                    className={`border p-4 rounded-lg cursor-pointer ${deliveryMethod === 'coleta' ? 'border-black ring-1 ring-black' : ''}`}
                    onClick={() => setDeliveryMethod('coleta')}
                  >
                    <RadioGroupItem value="coleta" id="coleta" className="sr-only" />
                    <Label htmlFor="coleta" className="cursor-pointer font-medium block">
                      Coleta na Loja (Miami)
                    </Label>
                    <span className="text-sm text-gray-500 block mt-1">Custo: USD 0.00</span>
                  </div>
                  <div
                    className={`border p-4 rounded-lg cursor-pointer ${deliveryMethod === 'miami' ? 'border-black ring-1 ring-black' : ''}`}
                    onClick={() => setDeliveryMethod('miami')}
                  >
                    <RadioGroupItem value="miami" id="miami" className="sr-only" />
                    <Label htmlFor="miami" className="cursor-pointer font-medium block">
                      Entrega em Miami
                    </Label>
                  </div>
                  <div
                    className={`border p-4 rounded-lg cursor-pointer ${deliveryMethod === 'usa' ? 'border-black ring-1 ring-black' : ''}`}
                    onClick={() => setDeliveryMethod('usa')}
                  >
                    <RadioGroupItem value="usa" id="usa" className="sr-only" />
                    <Label htmlFor="usa" className="cursor-pointer font-medium block">
                      Entrega EUA
                    </Label>
                  </div>
                  <div
                    className={`border p-4 rounded-lg cursor-pointer ${deliveryMethod === 'brasil' ? 'border-black ring-1 ring-black' : ''}`}
                    onClick={() => setDeliveryMethod('brasil')}
                  >
                    <RadioGroupItem value="brasil" id="brasil" className="sr-only" />
                    <Label htmlFor="brasil" className="cursor-pointer font-medium block">
                      Entrega Brasil (São Paulo)
                    </Label>
                  </div>
                </RadioGroup>

                {deliveryMethod === 'miami' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label>Rua</Label>
                      <Input
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={address.number}
                        onChange={(e) => setAddress({ ...address, number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input
                        value={address.complement}
                        onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value="Miami" readOnly disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input value="FL" readOnly disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input
                        value={address.zip_code}
                        onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {(deliveryMethod === 'usa' || deliveryMethod === 'brasil') && (
                  <div className="space-y-2 max-w-sm bg-gray-50 p-4 rounded-lg">
                    <Label>{deliveryMethod === 'usa' ? 'ZIP Code' : 'CEP'}</Label>
                    <Input
                      placeholder="Apenas números (mínimo 5)"
                      value={address.zip_code}
                      onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Voltar
                  </Button>
                  <Button onClick={handleCalculateFreight} disabled={!deliveryMethod || isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Calcular Frete
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* STEP 3 */}
          <Card className={currentStep !== 3 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>3. Cálculo de Frete</CardTitle>
            </CardHeader>
            {currentStep === 3 && (
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-medium">Frete calculado: USD {freight?.toFixed(2)}</p>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setCurrentStep(4)}>Continuar para Cupom</Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* STEP 4 */}
          <Card className={currentStep !== 4 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>4. Cupom de Desconto (Opcional)</CardTitle>
            </CardHeader>
            {currentStep === 4 && (
              <CardContent className="space-y-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-800 font-medium">
                      Cupom: {appliedCoupon} — Desconto: USD {discountAmount.toFixed(2)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAppliedCoupon(null)
                        setDiscountAmount(0)
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 max-w-md">
                    <Input
                      placeholder="Enter coupon code (optional)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode || isLoading}
                    >
                      Apply Coupon
                    </Button>
                  </div>
                )}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setCurrentStep(5)}>Continuar para Pagamento</Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* STEP 5 */}
          <Card className={currentStep !== 5 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>5. Seleção de Pagamento</CardTitle>
            </CardHeader>
            {currentStep === 5 && (
              <CardContent className="space-y-6">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div
                    className={`border p-4 rounded-lg cursor-pointer ${paymentMethod === 'stripe' ? 'border-black ring-1 ring-black' : ''}`}
                    onClick={() => setPaymentMethod('stripe')}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">Cartão de Crédito/Débito (Stripe)</span>
                    </div>
                  </div>
                  <div
                    className={`border p-4 rounded-lg cursor-pointer ${paymentMethod === 'transferencia_miami' ? 'border-black ring-1 ring-black' : ''}`}
                    onClick={() => setPaymentMethod('transferencia_miami')}
                  >
                    <div className="flex items-center gap-3">
                      <Landmark className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">Transferência Bancária (Miami, USD)</span>
                    </div>
                  </div>
                  <div
                    className={`border p-4 rounded-lg cursor-pointer ${paymentMethod === 'zelle' ? 'border-black ring-1 ring-black' : ''}`}
                    onClick={() => setPaymentMethod('zelle')}
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">Zelle</span>
                    </div>
                  </div>

                  {deliveryMethod === 'brasil' && (
                    <>
                      <div
                        className={`border p-4 rounded-lg cursor-pointer ${paymentMethod === 'pix' ? 'border-black ring-1 ring-black' : ''}`}
                        onClick={() => setPaymentMethod('pix')}
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-gray-500" />
                          <span className="font-medium">PIX</span>
                        </div>
                      </div>
                      <div
                        className={`border p-4 rounded-lg cursor-pointer ${paymentMethod === 'transferencia_brasil' ? 'border-black ring-1 ring-black' : ''}`}
                        onClick={() => setPaymentMethod('transferencia_brasil')}
                      >
                        <div className="flex items-center gap-3">
                          <Landmark className="w-5 h-5 text-gray-500" />
                          <span className="font-medium">Transferência Bancária (Brasil, BRL)</span>
                        </div>
                      </div>
                    </>
                  )}
                </RadioGroup>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(4)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setCurrentStep(6)} disabled={!paymentMethod}>
                    Continuar para Resumo
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* STEP 6 */}
          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>6. Confirmação do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    className="order-2 sm:order-1"
                    onClick={() => setCurrentStep(5)}
                  >
                    Voltar para Pagamento
                  </Button>
                  <Button
                    className="flex-1 order-1 sm:order-2"
                    size="lg"
                    onClick={handleConfirmOrder}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    Confirmar Pedido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>USD {subtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>- USD {discountAmount.toFixed(2)}</span>
                </div>
              )}

              {freight !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Frete</span>
                  <span>USD {freight.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>USD {total.toFixed(2)}</span>
              </div>

              {deliveryMethod && (
                <div className="pt-4 border-t text-sm text-gray-600">
                  <strong>Entrega:</strong> {deliveryMethod.toUpperCase()}
                  {deliveryMethod !== 'coleta' &&
                    address.zip_code &&
                    ` (ZIP/CEP: ${address.zip_code})`}
                </div>
              )}
              {paymentMethod && (
                <div className="pt-2 text-sm text-gray-600">
                  <strong>Pagamento:</strong> {paymentMethod.toUpperCase().replace('_', ' ')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showManualPaymentDialog} onOpenChange={setShowManualPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Instruções de Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Realize o pagamento de USD {total.toFixed(2)} utilizando as informações abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4 text-sm">
            {paymentMethod === 'zelle' && (
              <p>
                Envie o Zelle para: <strong className="block mt-1">payments@mywayvideo.com</strong>
              </p>
            )}
            {paymentMethod === 'transferencia_miami' && (
              <div className="bg-gray-50 p-4 rounded-md space-y-1">
                <p>
                  <strong>Bank:</strong> Bank of America
                </p>
                <p>
                  <strong>Routing (ABA):</strong> 123456789
                </p>
                <p>
                  <strong>Account:</strong> 987654321
                </p>
                <p>
                  <strong>Name:</strong> My Way Business LLC
                </p>
              </div>
            )}
            {paymentMethod === 'pix' && (
              <p>
                Chave PIX (CNPJ): <strong className="block mt-1">12.345.678/0001-99</strong>
              </p>
            )}
            {paymentMethod === 'transferencia_brasil' && (
              <div className="bg-gray-50 p-4 rounded-md space-y-1">
                <p>
                  <strong>Banco:</strong> Itaú
                </p>
                <p>
                  <strong>Agência:</strong> 0001
                </p>
                <p>
                  <strong>Conta:</strong> 12345-6
                </p>
                <p>
                  <strong>CNPJ:</strong> 12.345.678/0001-99
                </p>
              </div>
            )}
            <p className="mt-4 text-xs text-gray-500">
              * Por favor, inclua o código do pedido na descrição da transferência. Seu pedido só
              será processado após a confirmação do recebimento.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowManualPaymentDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={completeManualPayment}>
              Completei a Transferência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
