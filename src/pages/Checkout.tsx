import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/useCart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Loader2,
  CreditCard,
  Landmark,
  Smartphone,
  Trash2,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value)
}

const btnPrimary =
  'bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg border-none cursor-pointer transition-all duration-200 ease-out hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(5,150,105,0.2)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 flex items-center justify-center text-center'
const btnSecondary =
  'border-2 border-emerald-600 text-emerald-600 bg-white font-semibold py-3 px-6 rounded-lg cursor-pointer transition-all duration-200 ease-out hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 flex items-center justify-center text-center'
const inputClass =
  'border-slate-200 rounded-lg px-4 py-3 h-auto text-base transition-colors duration-200 ease-out focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20 focus-visible:ring-4 bg-white'

function StepWrapper({
  step,
  currentStep,
  title,
  children,
}: {
  step: number
  currentStep: number
  title: string
  children: React.ReactNode
}) {
  const isActive = currentStep === step
  const isCompleted = currentStep > step

  return (
    <div
      className={cn(
        'border rounded-xl p-6 transition-all duration-300 ease-out',
        isActive
          ? 'border-emerald-600 bg-emerald-50/30 shadow-[0_4px_12px_rgba(5,150,105,0.1)]'
          : isCompleted
            ? 'border-emerald-600 bg-white'
            : 'border-slate-200 bg-white opacity-60 pointer-events-none',
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'w-10 h-10 shrink-0 rounded-full font-bold flex items-center justify-center transition-colors duration-300',
            isActive || isCompleted
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-200 text-slate-500',
          )}
        >
          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : step}
        </div>
        <h2
          className={cn(
            'text-xl font-semibold transition-colors duration-300',
            isActive || isCompleted ? 'text-slate-900' : 'text-slate-500',
          )}
        >
          {title}
        </h2>
      </div>

      {isActive && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out pt-6 mt-6 border-t border-slate-200">
          {children}
        </div>
      )}
    </div>
  )
}

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
    const params = new URLSearchParams(window.location.search)
    if (params.get('cancel') === 'paypal') {
      toast({
        description: 'Pagamento cancelado no PayPal. Tente novamente.',
        variant: 'destructive',
      })
      navigate('/checkout', { replace: true })
    }
  }, [navigate, toast])

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
    if (method === 'paypal') return 'paypal'
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
      } else if (paymentMethod === 'paypal') {
        const { data: paypalData, error: paypalErr } = await supabase.functions.invoke(
          'create-paypal-payment-intent',
          {
            body: { order_id: order.id, amount: Math.round(total * 100) },
          },
        )
        if (paypalErr || !paypalData?.paypal_approval_url) {
          toast({
            description: 'Erro ao conectar com PayPal. Tente novamente.',
            variant: 'destructive',
          })
          setIsLoading(false)
          return
        }
        if (cartContext?.clearCart) cartContext.clearCart()
        localStorage.removeItem('cart')
        window.location.href = paypalData.paypal_approval_url
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

  const getPaymentOptions = () => {
    const baseOptions = [
      {
        id: 'stripe',
        label: 'Cartão de Crédito',
        desc: 'Pagamento seguro via Stripe',
        icon: (
          <CreditCard className="w-8 h-8 text-slate-600 group-hover:text-emerald-600 transition-colors" />
        ),
      },
      {
        id: 'transferencia_miami',
        label: 'Transferência (EUA)',
        desc: 'Conta em Miami (USD)',
        icon: (
          <Landmark className="w-8 h-8 text-slate-600 group-hover:text-emerald-600 transition-colors" />
        ),
      },
      {
        id: 'zelle',
        label: 'Zelle',
        desc: 'Transferência via Zelle',
        icon: (
          <Smartphone className="w-8 h-8 text-slate-600 group-hover:text-emerald-600 transition-colors" />
        ),
      },
      {
        id: 'paypal',
        label: 'PayPal',
        desc: 'Pague com sua conta PayPal',
        icon: <CreditCard className="w-8 h-8 text-blue-600" />,
      },
    ]
    if (deliveryMethod === 'brasil') {
      return [
        ...baseOptions,
        {
          id: 'pix',
          label: 'PIX',
          desc: 'Pagamento instantâneo',
          icon: <Smartphone className="w-8 h-8 text-emerald-600" />,
        },
        {
          id: 'transferencia_brasil',
          label: 'Transferência (Brasil)',
          desc: 'Conta no Brasil (BRL)',
          icon: (
            <Landmark className="w-8 h-8 text-slate-600 group-hover:text-emerald-600 transition-colors" />
          ),
        },
      ]
    }
    return baseOptions
  }

  const renderOrderSummary = () => (
    <div className="space-y-4">
      <div className="flex justify-between py-3 border-b border-slate-200">
        <span className="font-medium text-slate-500">Subtotal</span>
        <span className="font-semibold text-slate-900 font-mono text-base">
          {formatCurrency(subtotal)}
        </span>
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between py-3 border-b border-slate-200">
          <span className="font-semibold text-emerald-600">Desconto</span>
          <span className="font-bold text-emerald-600 font-mono text-base">
            -{formatCurrency(discountAmount)}
          </span>
        </div>
      )}

      {freight !== null && (
        <div className="flex justify-between py-3 border-b border-slate-200">
          <span className="font-medium text-slate-500">Frete</span>
          <span className="font-semibold text-slate-900 font-mono text-base">
            {formatCurrency(freight)}
          </span>
        </div>
      )}

      <div className="flex justify-between py-5 border-b-2 border-slate-200 mt-2">
        <span className="text-xl font-bold text-slate-900">Total</span>
        <span className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">
          {formatCurrency(total)}
        </span>
      </div>

      {appliedCoupon && (
        <div className="bg-emerald-600 text-white py-3 px-4 rounded-xl text-sm mt-6 flex justify-between items-center shadow-md shadow-emerald-600/20">
          <span className="font-medium">Cupom: {appliedCoupon}</span>
          <span className="font-bold">-{formatCurrency(discountAmount)}</span>
        </div>
      )}

      {deliveryMethod && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-xl mt-6 text-sm leading-relaxed text-slate-800">
          <strong className="text-slate-900">Entrega:</strong> {deliveryMethod.toUpperCase()}
          {deliveryMethod !== 'coleta' && address.zip_code && (
            <span className="block mt-1">ZIP/CEP: {address.zip_code}</span>
          )}
        </div>
      )}

      {paymentMethod && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-xl mt-3 text-sm leading-relaxed text-slate-800">
          <strong className="text-slate-900">Pagamento:</strong>{' '}
          {paymentMethod.toUpperCase().replace('_', ' ')}
        </div>
      )}
    </div>
  )

  if (orderConfirmed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-emerald-100 rounded-3xl p-8 text-center shadow-xl shadow-emerald-900/5 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-4">
            Pedido Confirmado!
          </h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Seu pedido foi recebido com sucesso e está aguardando a confirmação do pagamento manual.
            Entraremos em contato em breve.
          </p>
          <button onClick={() => navigate('/')} className={cn(btnPrimary, 'w-full')}>
            Voltar à Loja
          </button>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0 && currentStep === 1) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-8 font-sans">
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Seu carrinho está vazio</h3>
          <p className="text-slate-500 mb-8 text-lg max-w-sm">
            Adicione alguns produtos fantásticos para continuar com o checkout.
          </p>
          <button onClick={() => navigate('/')} className={btnPrimary}>
            Continuar Comprando
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-8 font-sans pb-32 lg:pb-8">
      <h1 className="text-4xl font-bold tracking-tight text-emerald-600 mb-8 lg:mb-10">
        Checkout Automatizado
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1 */}
          <StepWrapper step={1} currentStep={currentStep} title="Revisão do Carrinho">
            <div className="space-y-2">
              {cartItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-5 border-b border-slate-200 gap-5 last:border-0"
                >
                  <div className="flex items-center gap-5 flex-1">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                        <span className="text-xs font-medium text-slate-400">Sem Foto</span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-900 line-clamp-2 text-lg leading-tight mb-1">
                        {item.name}
                      </p>
                      <p className="text-sm text-slate-500 font-medium font-mono">
                        {formatCurrency(item.unit_price)}{' '}
                        <span className="text-xs font-sans">un.</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="px-4 py-2 hover:bg-slate-100 transition-colors text-slate-600 font-bold focus-visible:outline-emerald-600"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 border-x border-slate-200 font-semibold text-slate-900 min-w-[3.5rem] text-center bg-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="px-4 py-2 hover:bg-slate-100 transition-colors text-slate-600 font-bold focus-visible:outline-emerald-600"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold text-slate-900 w-28 text-right font-mono text-lg">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors focus-visible:outline-red-600"
                      aria-label="Remover item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8">
              <button className={btnSecondary} onClick={() => navigate('/cart')}>
                Editar Carrinho
              </button>
              <button
                className={btnPrimary}
                onClick={() => setCurrentStep(2)}
                disabled={cartItems.length === 0}
              >
                Continuar para Entrega
              </button>
            </div>
          </StepWrapper>

          {/* STEP 2 */}
          <StepWrapper step={2} currentStep={currentStep} title="Seleção de Entrega">
            <RadioGroup
              value={deliveryMethod}
              onValueChange={setDeliveryMethod}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {[
                { id: 'coleta', label: 'Coleta na Loja', desc: 'Retirada em Miami - USD 0.00' },
                { id: 'miami', label: 'Entrega em Miami', desc: 'Requer endereço completo' },
                { id: 'usa', label: 'Entrega EUA', desc: 'Requer ZIP code' },
                { id: 'brasil', label: 'Entrega Brasil (SP)', desc: 'Requer CEP válido' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setDeliveryMethod(opt.id)}
                  className={cn(
                    'group border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ease-out',
                    deliveryMethod === opt.id
                      ? 'border-emerald-600 bg-emerald-50 shadow-[0_4px_12px_rgba(5,150,105,0.1)]'
                      : 'border-slate-200 hover:border-emerald-300',
                  )}
                >
                  <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
                  <Label
                    htmlFor={opt.id}
                    className="cursor-pointer font-bold text-slate-900 block text-lg mb-1"
                  >
                    {opt.label}
                  </Label>
                  <span className="text-sm font-medium text-slate-500 group-hover:text-slate-600">
                    {opt.desc}
                  </span>
                </div>
              ))}
            </RadioGroup>

            {deliveryMethod === 'miami' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50/80 p-6 rounded-2xl border border-slate-200 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-800">Rua</Label>
                  <Input
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className={inputClass}
                    placeholder="Nome da rua"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-800">Número</Label>
                  <Input
                    value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: 123"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-800">
                    Complemento <span className="text-slate-400 font-normal">(Opcional)</span>
                  </Label>
                  <Input
                    value={address.complement}
                    onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                    className={inputClass}
                    placeholder="Apto, Sala..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-800">ZIP Code</Label>
                  <Input
                    value={address.zip_code}
                    onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                    className={inputClass}
                    placeholder="Apenas números"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-800">Cidade</Label>
                  <Input
                    value="Miami"
                    readOnly
                    disabled
                    className={cn(inputClass, 'bg-slate-100 text-slate-500 opacity-70')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-800">Estado</Label>
                  <Input
                    value="FL"
                    readOnly
                    disabled
                    className={cn(inputClass, 'bg-slate-100 text-slate-500 opacity-70')}
                  />
                </div>
              </div>
            )}

            {(deliveryMethod === 'usa' || deliveryMethod === 'brasil') && (
              <div className="space-y-3 bg-slate-50/80 p-6 rounded-2xl border border-slate-200 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="font-semibold text-slate-800 text-base">
                  {deliveryMethod === 'usa' ? 'ZIP Code de Destino' : 'CEP de Destino'}
                </Label>
                <Input
                  placeholder="Digite apenas números (mínimo 5)"
                  value={address.zip_code}
                  onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                  className={cn(inputClass, 'max-w-md text-lg font-mono')}
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8">
              <button className={btnSecondary} onClick={() => setCurrentStep(1)}>
                Voltar
              </button>
              <button
                className={btnPrimary}
                onClick={handleCalculateFreight}
                disabled={!deliveryMethod || isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Calcular Frete
              </button>
            </div>
          </StepWrapper>

          {/* STEP 3 */}
          <StepWrapper step={3} currentStep={currentStep} title="Cálculo de Frete">
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-6 rounded-xl flex items-center justify-between">
              <p className="text-lg font-medium text-slate-800">Custo estimado de frete:</p>
              <p className="text-2xl font-bold font-mono text-emerald-700">
                {formatCurrency(freight || 0)}
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8">
              <button className={btnSecondary} onClick={() => setCurrentStep(2)}>
                Voltar
              </button>
              <button className={btnPrimary} onClick={() => setCurrentStep(4)}>
                Continuar para Cupom
              </button>
            </div>
          </StepWrapper>

          {/* STEP 4 */}
          <StepWrapper step={4} currentStep={currentStep} title="Cupom de Desconto">
            {appliedCoupon ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-600/20 gap-4">
                <div className="text-white">
                  <p className="font-bold text-lg mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Cupom Aplicado!
                  </p>
                  <p className="text-emerald-100 font-medium tracking-wide">
                    {appliedCoupon} — <span className="opacity-80">Desconto:</span>{' '}
                    <span className="font-mono font-bold text-white ml-1">
                      {formatCurrency(discountAmount)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAppliedCoupon(null)
                    setDiscountAmount(0)
                  }}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-semibold text-sm border border-white/10 w-full sm:w-auto"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Digite o código do cupom (opcional)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className={cn(inputClass, 'flex-1 uppercase font-mono tracking-wider text-lg')}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode || isLoading}
                  className={cn(btnSecondary, 'min-w-[160px]')}
                >
                  Aplicar Cupom
                </button>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8">
              <button className={btnSecondary} onClick={() => setCurrentStep(3)}>
                Voltar
              </button>
              <button className={btnPrimary} onClick={() => setCurrentStep(5)}>
                Continuar para Pagamento
              </button>
            </div>
          </StepWrapper>

          {/* STEP 5 */}
          <StepWrapper step={5} currentStep={currentStep} title="Seleção de Pagamento">
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {getPaymentOptions().map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={cn(
                    'group border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ease-out flex flex-col items-center text-center',
                    paymentMethod === opt.id
                      ? 'border-emerald-600 bg-emerald-50 shadow-[0_4px_12px_rgba(5,150,105,0.1)]'
                      : 'border-slate-200 hover:border-emerald-300',
                  )}
                >
                  <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
                  <div className="mb-4 transform transition-transform group-hover:scale-110 duration-300">
                    {opt.icon}
                  </div>
                  <Label
                    htmlFor={opt.id}
                    className="cursor-pointer font-bold text-slate-900 block text-lg mb-1"
                  >
                    {opt.label}
                  </Label>
                  <span className="text-sm font-medium text-slate-500">{opt.desc}</span>
                </div>
              ))}
            </RadioGroup>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8">
              <button className={btnSecondary} onClick={() => setCurrentStep(4)}>
                Voltar
              </button>
              <button
                className={btnPrimary}
                onClick={() => setCurrentStep(6)}
                disabled={!paymentMethod}
              >
                Continuar para Resumo
              </button>
            </div>
          </StepWrapper>

          {/* STEP 6 */}
          {currentStep === 6 && (
            <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Tudo certo para finalizar?</h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed text-lg">
                Revise os dados da sua entrega e o resumo do pedido. Ao confirmar, seu pedido será
                gerado com segurança.
              </p>

              <div className="flex flex-col-reverse sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                <button className={cn(btnSecondary, 'flex-1')} onClick={() => setCurrentStep(5)}>
                  Voltar
                </button>
                <button
                  className={cn(btnPrimary, 'flex-1 text-lg py-4 shadow-lg shadow-emerald-600/30')}
                  onClick={handleConfirmOrder}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 mr-2" />
                  )}
                  Confirmar Pedido
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column Summary - Desktop Only */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="bg-slate-50 rounded-2xl p-8 sticky top-8 border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Resumo do Pedido</h3>
            {renderOrderSummary()}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Summary Drawer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 flex justify-between items-center shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-safe">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
            Total a Pagar
          </p>
          <p className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">
            {formatCurrency(total)}
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="text-emerald-600 bg-emerald-50 font-bold px-6 py-3 border-2 border-emerald-200 hover:border-emerald-600 rounded-xl transition-colors shadow-sm">
              Ver Resumo
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-[2rem] px-6 pt-8 pb-12 bg-white max-h-[85vh] overflow-y-auto border-t border-slate-200 shadow-2xl"
          >
            <SheetHeader className="mb-6 text-left">
              <SheetTitle className="text-2xl font-bold text-slate-900">
                Resumo do Pedido
              </SheetTitle>
            </SheetHeader>
            {renderOrderSummary()}
          </SheetContent>
        </Sheet>
      </div>

      <AlertDialog open={showManualPaymentDialog} onOpenChange={setShowManualPaymentDialog}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl sm:max-w-lg bg-white p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-bold text-slate-900 mb-2">
              Instruções de Pagamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-slate-600">
              Realize o pagamento de{' '}
              <strong className="text-emerald-600 font-mono font-bold">
                {formatCurrency(total)}
              </strong>{' '}
              utilizando as informações abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-6 text-base text-slate-700">
            {paymentMethod === 'zelle' && (
              <div className="bg-slate-50 border-l-4 border-emerald-600 p-5 rounded-xl">
                <p className="font-medium text-slate-500 mb-1">Envie o Zelle para:</p>
                <strong className="block text-slate-900 text-xl">payments@mywayvideo.com</strong>
              </div>
            )}
            {paymentMethod === 'transferencia_miami' && (
              <div className="bg-slate-50 border-l-4 border-emerald-600 p-5 rounded-xl space-y-2">
                <p>
                  <strong className="text-slate-900 w-32 inline-block">Bank:</strong> Bank of
                  America
                </p>
                <p>
                  <strong className="text-slate-900 w-32 inline-block">Routing (ABA):</strong>{' '}
                  <span className="font-mono">123456789</span>
                </p>
                <p>
                  <strong className="text-slate-900 w-32 inline-block">Account:</strong>{' '}
                  <span className="font-mono">987654321</span>
                </p>
                <p>
                  <strong className="text-slate-900 w-32 inline-block">Name:</strong> My Way
                  Business LLC
                </p>
              </div>
            )}
            {paymentMethod === 'pix' && (
              <div className="bg-slate-50 border-l-4 border-emerald-600 p-5 rounded-xl">
                <p className="font-medium text-slate-500 mb-1">Chave PIX (CNPJ):</p>
                <strong className="block text-slate-900 text-xl font-mono tracking-wide">
                  12.345.678/0001-99
                </strong>
              </div>
            )}
            {paymentMethod === 'transferencia_brasil' && (
              <div className="bg-slate-50 border-l-4 border-emerald-600 p-5 rounded-xl space-y-2">
                <p>
                  <strong className="text-slate-900 w-24 inline-block">Banco:</strong> Itaú
                </p>
                <p>
                  <strong className="text-slate-900 w-24 inline-block">Agência:</strong>{' '}
                  <span className="font-mono">0001</span>
                </p>
                <p>
                  <strong className="text-slate-900 w-24 inline-block">Conta:</strong>{' '}
                  <span className="font-mono">12345-6</span>
                </p>
                <p>
                  <strong className="text-slate-900 w-24 inline-block">CNPJ:</strong>{' '}
                  <span className="font-mono">12.345.678/0001-99</span>
                </p>
              </div>
            )}
            <p className="mt-8 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded-xl leading-relaxed font-medium">
              * Por favor, inclua o código do pedido na descrição da transferência. Seu pedido só
              será processado após a confirmação do recebimento pela nossa equipe.
            </p>
          </div>
          <AlertDialogFooter className="gap-3 sm:gap-4 mt-4">
            <AlertDialogCancel
              onClick={() => setShowManualPaymentDialog(false)}
              className="rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:text-slate-900 py-6 px-6"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={completeManualPayment}
              className="rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 border-none shadow-lg shadow-emerald-600/30 py-6 px-8"
            >
              Completei a Transferência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
