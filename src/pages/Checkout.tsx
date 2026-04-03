import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/useCart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  'bg-[hsl(152,68%,40%)] text-[hsl(0,0%,100%)] font-semibold py-3 px-6 rounded-lg border-none cursor-pointer transition-all duration-200 ease-out hover:bg-[hsl(152,68%,35%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(152,68%,40%)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-center'
const btnSecondary =
  'bg-[hsl(215,20%,90%)] text-[hsl(215,25%,15%)] font-semibold py-3 px-6 rounded-lg border-none cursor-pointer transition-all duration-200 ease-out hover:bg-[hsl(215,20%,85%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(215,25%,15%)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-center'
const inputClass =
  'bg-[hsl(215,20%,96%)] text-[hsl(215,25%,15%)] border-2 border-[hsl(215,20%,90%)] rounded-lg px-4 py-3 h-auto text-base font-normal transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[hsl(152,68%,40%)] focus-visible:shadow-[0_0_0_3px_hsl(152,68%,10%)] placeholder:text-[hsl(215,15%,45%)] placeholder:text-base placeholder:font-normal w-full'

function StepWrapper({
  step,
  currentStep,
  title,
  children,
  onStepClick,
}: {
  step: number
  currentStep: number
  title: string
  children: React.ReactNode
  onStepClick?: (step: number) => void
}) {
  const isActive = currentStep === step
  const isCompleted = currentStep > step

  return (
    <div
      className={cn(
        'border rounded-xl p-6 transition-all duration-300 ease-out',
        isActive
          ? 'border-[hsl(152,68%,40%)] bg-[hsl(152,68%,98%)] shadow-[0_4px_12px_rgba(5,150,105,0.1)]'
          : isCompleted
            ? 'border-[hsl(152,68%,40%)] bg-white'
            : 'border-slate-200 bg-white opacity-60 pointer-events-none',
      )}
    >
      <div
        className={cn('flex items-center gap-4', isCompleted && 'cursor-pointer group')}
        onClick={() => isCompleted && onStepClick?.(step)}
      >
        <div
          className={cn(
            'w-10 h-10 shrink-0 rounded-full font-bold flex items-center justify-center transition-colors duration-300',
            isActive || isCompleted
              ? 'bg-[hsl(152,68%,40%)] text-white shadow-md shadow-[hsl(152,68%,40%)]/20'
              : 'bg-slate-200 text-slate-500',
            isCompleted && 'group-hover:bg-[hsl(152,68%,35%)]',
          )}
        >
          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : step}
        </div>
        <h2
          className={cn(
            'text-xl font-semibold transition-colors duration-300',
            isActive || isCompleted ? 'text-slate-900' : 'text-slate-500',
            isCompleted && 'group-hover:text-[hsl(152,68%,40%)]',
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
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false)
  const [saveNewAddress, setSaveNewAddress] = useState(true)

  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zip_code: '',
  })
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})

  const [freight, setFreight] = useState<number | null>(null)
  const [shippingMessage, setShippingMessage] = useState<string>('')
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)

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
    fetchAddresses()
  }, [user, loading, cartContext])

  const fetchAddresses = async () => {
    if (!user) return
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (customer) {
        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('address_type', 'shipping')
        if (addresses) setSavedAddresses(addresses)
      }
    } catch (e) {
      console.error('Error fetching addresses:', e)
    }
  }

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
            weight: prod.weight || p.weight || 1,
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

  const getFilteredAddresses = (method: string = deliveryMethod) => {
    if (method === 'miami') {
      return savedAddresses.filter(
        (a) => a.city?.toLowerCase() === 'miami' && a.state?.toLowerCase() === 'fl',
      )
    }
    if (method === 'usa') {
      return savedAddresses.filter(
        (a) =>
          (a.country?.toLowerCase() === 'usa' || a.country?.toLowerCase() === 'estados unidos') &&
          a.state?.toLowerCase() !== 'fl',
      )
    }
    if (method === 'brasil') {
      return savedAddresses.filter(
        (a) => a.country?.toLowerCase() === 'brasil' && a.state?.toUpperCase() === 'SP',
      )
    }
    return []
  }

  const handleDeliveryChange = (val: string) => {
    setDeliveryMethod(val)
    setFreight(null)

    if (val === 'coleta') return

    const filtered = getFilteredAddresses(val)
    if (filtered.length > 0) {
      setSelectedAddressId(filtered[0].id)
      setIsAddingNewAddress(false)
      setAddress({
        street: filtered[0].street,
        number: filtered[0].number,
        complement: filtered[0].complement || '',
        city: filtered[0].city,
        state: filtered[0].state,
        zip_code: filtered[0].zip_code,
      })
    } else {
      setSelectedAddressId(null)
      setIsAddingNewAddress(true)
      setAddress({ street: '', number: '', complement: '', city: '', state: '', zip_code: '' })
      if (val === 'miami') setAddress((a) => ({ ...a, city: 'Miami', state: 'FL' }))
      if (val === 'brasil') setAddress((a) => ({ ...a, city: 'Sao Paulo', state: 'SP' }))
    }
  }

  const handleZipBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const zip = e.target.value.replace(/\D/g, '')
    if (!zip) return

    const zipNum = parseInt(zip, 10)

    if (deliveryMethod === 'miami') {
      if (zipNum < 33101 || zipNum > 33199 || isNaN(zipNum)) {
        toast({
          description: 'Entrega em Miami requer um ZIP válido de Miami.',
          variant: 'destructive',
        })
        return
      }
    } else if (deliveryMethod === 'usa') {
      if (zipNum >= 33101 && zipNum <= 33199) {
        toast({
          description:
            'Não é possível usar um ZIP de Miami para entrega nos EUA. Selecione Entrega em Miami ou use um ZIP de outro estado.',
          variant: 'destructive',
        })
        return
      }
    } else if (deliveryMethod === 'brasil') {
      if (zipNum < 1000000 || zipNum > 19999999 || isNaN(zipNum) || zip.length !== 8) {
        toast({
          description:
            'Entrega no Brasil é disponível apenas para São Paulo. Seu CEP não é de São Paulo. Verifique o endereço.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('lookup-address', {
        body: { cep_or_zip: zip, country: deliveryMethod === 'brasil' ? 'Brasil' : 'USA' },
      })

      if (data && !error && !data.error) {
        setAddress((prev) => ({
          ...prev,
          street: data.street || prev.street,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }))
        toast({ description: 'Endereço encontrado com sucesso.' })
      } else if (deliveryMethod === 'brasil' && zip.length === 8) {
        const res = await fetch(`https://viacep.com.br/ws/${zip}/json/`)
        const viacepData = await res.json()
        if (!viacepData.erro) {
          setAddress((prev) => ({
            ...prev,
            street: viacepData.logradouro || prev.street,
            city: viacepData.localidade || prev.city,
            state: viacepData.uf || prev.state,
          }))
          toast({ description: 'Endereço encontrado com sucesso.' })
        } else {
          toast({
            description:
              'Não foi possível validar o endereço. Tente novamente ou preencha manualmente.',
            variant: 'destructive',
          })
        }
      } else {
        toast({
          description:
            'Não foi possível preencher o endereço automaticamente. Preencha manualmente.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        description:
          'Não foi possível validar o endereço. Tente novamente ou preencha manualmente.',
        variant: 'destructive',
      })
    }
  }

  const validateAddress = () => {
    if (deliveryMethod === 'coleta') {
      setAddressErrors({})
      return true
    }

    if (!isAddingNewAddress && selectedAddressId) {
      setAddressErrors({})
      return true
    }

    const errors: Record<string, string> = {}
    let isValid = true

    if (!address.street || address.street.trim().length < 3) {
      errors.street = 'Rua deve ter no mínimo 3 caracteres.'
      isValid = false
    }
    if (!address.number || address.number.trim().length < 1) {
      errors.number = 'Número é obrigatório.'
      isValid = false
    }
    if (!address.city || address.city.trim().length < 2) {
      errors.city = 'Cidade deve ter no mínimo 2 caracteres.'
      isValid = false
    }
    if (!address.state || address.state.trim().length !== 2) {
      errors.state = 'Estado deve ter 2 caracteres.'
      isValid = false
    }

    const zip = address.zip_code.replace(/\D/g, '')
    const zipNum = parseInt(zip, 10)

    if (!zip) {
      errors.zip_code = 'CEP/ZIP code é obrigatório.'
      isValid = false
    } else if (deliveryMethod === 'brasil' && zip.length !== 8) {
      errors.zip_code = 'CEP deve ter 8 dígitos.'
      isValid = false
    } else if ((deliveryMethod === 'usa' || deliveryMethod === 'miami') && zip.length !== 5) {
      errors.zip_code = 'ZIP code deve ter 5 dígitos.'
      isValid = false
    } else if (deliveryMethod === 'miami' && (zipNum < 33101 || zipNum > 33199 || isNaN(zipNum))) {
      errors.zip_code = 'Entrega em Miami requer um ZIP válido de Miami.'
      isValid = false
    } else if (deliveryMethod === 'usa' && zipNum >= 33101 && zipNum <= 33199) {
      errors.zip_code = 'ZIP de Miami. Use Entrega em Miami.'
      isValid = false
    }

    setAddressErrors(errors)

    if (!isValid) {
      toast({ description: 'Verifique os erros nos campos de endereço.', variant: 'destructive' })
    }

    return isValid
  }

  const handleCalculateFreightClick = async () => {
    if (!validateAddress()) return

    setIsLoading(true)
    try {
      if (deliveryMethod !== 'coleta' && isAddingNewAddress && saveNewAddress && user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (customer) {
          const { data: newAddrData, error: addrErr } = await supabase
            .from('customer_addresses')
            .insert({
              customer_id: customer.id,
              address_type: 'shipping',
              street: address.street || 'N/A',
              number: address.number || 'S/N',
              complement: address.complement || null,
              neighborhood: 'N/A',
              city: address.city || (deliveryMethod === 'miami' ? 'Miami' : 'N/A'),
              state: address.state || (deliveryMethod === 'miami' ? 'FL' : 'N/A'),
              zip_code: address.zip_code || '00000',
              country: deliveryMethod === 'brasil' ? 'Brasil' : 'USA',
              is_default: saveNewAddress,
            })
            .select('id')
            .single()

          if (!addrErr && newAddrData) {
            setSelectedAddressId(newAddrData.id)
            setIsAddingNewAddress(false)
            setSavedAddresses((prev) => [
              {
                id: newAddrData.id,
                customer_id: customer.id,
                address_type: 'shipping',
                street: address.street || 'N/A',
                number: address.number || 'S/N',
                complement: address.complement || null,
                neighborhood: 'N/A',
                city: address.city || (deliveryMethod === 'miami' ? 'Miami' : 'N/A'),
                state: address.state || (deliveryMethod === 'miami' ? 'FL' : 'N/A'),
                zip_code: address.zip_code || '00000',
                country: deliveryMethod === 'brasil' ? 'Brasil' : 'USA',
                is_default: saveNewAddress,
              },
              ...prev,
            ])
          }
        }
      }

      setFreight(null)
      setShippingMessage('')
      setShippingError(null)
      setCurrentStep(3)
    } catch (err) {
      toast({ description: 'Erro ao processar. Tente novamente.', variant: 'destructive' })
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    await handleCalculateShippingAction()
  }

  const handleCalculateShippingAction = async () => {
    if (!validateAddress()) {
      setCurrentStep(2)
      return
    }

    setIsCalculatingShipping(true)
    setShippingError(null)

    try {
      const payload = {
        delivery_type: deliveryMethod === 'brasil' ? 'sao_paulo' : deliveryMethod,
        address:
          deliveryMethod === 'coleta'
            ? {}
            : {
                street: address.street,
                number: address.number,
                city: address.city,
                state: address.state,
                zip_code: address.zip_code,
                country: deliveryMethod === 'brasil' ? 'Brasil' : 'USA',
              },
        cart_items: cartItems.map((item) => ({
          weight_kg: item.weight || 1,
          price_usd: item.unit_price,
        })),
      }

      const { data, error } = await supabase.functions.invoke('calculate-shipping', {
        body: payload,
      })

      if (error) {
        let parsedErr = 'Erro ao processar. Tente novamente.'
        try {
          if (error.context && typeof error.context.json === 'function') {
            const bodyJson = await error.context.json()
            if (bodyJson.error) parsedErr = bodyJson.error
          } else if (error.context && typeof error.context.text === 'function') {
            const bodyStr = await error.context.text()
            const bodyJson = JSON.parse(bodyStr)
            if (bodyJson.error) parsedErr = bodyJson.error
          } else if (error.context && error.context.error) {
            parsedErr = error.context.error
          } else if (
            error.message &&
            error.message !== 'Edge Function returned a non-2xx status code'
          ) {
            parsedErr = error.message
          }
        } catch (e) {
          // ignore
        }
        throw new Error(parsedErr)
      }

      if (data && data.error) {
        setShippingError(data.error)
        setFreight(null)
      } else if (data && typeof data.shipping_cost === 'number') {
        setFreight(data.shipping_cost)
        setShippingMessage(data.message || '')
        setShippingError(null)
      } else {
        throw new Error('Retorno inválido')
      }
    } catch (err: any) {
      console.error('Erro calcular frete:', err)
      setShippingError(err.message || 'Erro ao processar. Tente novamente.')
      setFreight(null)
    } finally {
      setIsCalculatingShipping(false)
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
        if (selectedAddressId && !isAddingNewAddress) {
          shippingAddressId = selectedAddressId
        } else {
          const { data: addrData } = await supabase
            .from('customer_addresses')
            .insert({
              customer_id: customer.id,
              address_type: 'shipping',
              street: address.street || 'N/A',
              number: address.number || 'S/N',
              complement: address.complement || null,
              neighborhood: 'N/A',
              city: address.city || (deliveryMethod === 'miami' ? 'Miami' : 'N/A'),
              state: address.state || (deliveryMethod === 'miami' ? 'FL' : 'N/A'),
              zip_code: address.zip_code || '00000',
              country: deliveryMethod === 'brasil' ? 'Brasil' : 'USA',
              is_default: saveNewAddress,
            })
            .select('id')
            .single()
          if (addrData) shippingAddressId = addrData.id
        }
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
        icon: (
          <CreditCard className="w-8 h-8 text-[#003087] group-hover:text-[#0079C1] transition-colors" />
        ),
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

  const renderAddresses = () => {
    const filtered = getFilteredAddresses()

    if (isAddingNewAddress || filtered.length === 0) {
      return (
        <div className="bg-[hsl(215,20%,96%)] p-6 rounded-2xl border border-[hsl(215,20%,90%)] space-y-5 relative mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {filtered.length > 0 && (
            <button
              onClick={() => {
                setIsAddingNewAddress(false)
                if (filtered.length > 0) {
                  const a = filtered[0]
                  setSelectedAddressId(a.id)
                  setAddress({
                    street: a.street,
                    number: a.number,
                    complement: a.complement || '',
                    city: a.city,
                    state: a.state,
                    zip_code: a.zip_code,
                  })
                }
              }}
              className="absolute top-4 right-4 text-sm font-semibold text-[hsl(215,15%,45%)] hover:text-[hsl(215,25%,15%)]"
            >
              Cancelar
            </button>
          )}
          <h4 className="font-bold text-[hsl(215,25%,15%)] mb-2">Adicionar Novo Endereço</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 sm:col-span-2">
              <Label className="font-semibold text-[hsl(215,25%,15%)]">ZIP Code / CEP</Label>
              <Input
                value={address.zip_code}
                onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                onBlur={handleZipBlur}
                className={cn(
                  inputClass,
                  addressErrors.zip_code &&
                    'border-red-500 focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
                )}
                placeholder={deliveryMethod === 'brasil' ? 'Ex: 01000-000' : 'Apenas números'}
              />
              {addressErrors.zip_code && (
                <p className="text-red-500 text-sm">{addressErrors.zip_code}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="font-semibold text-[hsl(215,25%,15%)]">Logradouro</Label>
              <Input
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                className={cn(
                  inputClass,
                  addressErrors.street &&
                    'border-red-500 focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
                )}
                placeholder="Nome do logradouro"
              />
              {addressErrors.street && (
                <p className="text-red-500 text-sm">{addressErrors.street}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-[hsl(215,25%,15%)]">Número</Label>
              <Input
                value={address.number}
                onChange={(e) => setAddress({ ...address, number: e.target.value })}
                className={cn(
                  inputClass,
                  addressErrors.number &&
                    'border-red-500 focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
                )}
                placeholder="Ex: 123"
              />
              {addressErrors.number && (
                <p className="text-red-500 text-sm">{addressErrors.number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-[hsl(215,25%,15%)]">Complemento</Label>
              <Input
                value={address.complement}
                onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                className={inputClass}
                placeholder="Apto, Sala..."
              />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-[hsl(215,25%,15%)]">Cidade</Label>
              <Input
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className={cn(
                  inputClass,
                  (deliveryMethod === 'miami' || deliveryMethod === 'brasil') &&
                    'opacity-70 cursor-not-allowed',
                  addressErrors.city &&
                    'border-red-500 focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
                )}
                readOnly={deliveryMethod === 'miami' || deliveryMethod === 'brasil'}
              />
              {addressErrors.city && <p className="text-red-500 text-sm">{addressErrors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-[hsl(215,25%,15%)]">Estado</Label>
              <Input
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                className={cn(
                  inputClass,
                  (deliveryMethod === 'miami' || deliveryMethod === 'brasil') &&
                    'opacity-70 cursor-not-allowed',
                  addressErrors.state &&
                    'border-red-500 focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
                )}
                readOnly={deliveryMethod === 'miami' || deliveryMethod === 'brasil'}
              />
              {addressErrors.state && <p className="text-red-500 text-sm">{addressErrors.state}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="save-address"
              checked={saveNewAddress}
              onCheckedChange={(c) => setSaveNewAddress(c as boolean)}
            />
            <Label
              htmlFor="save-address"
              className="cursor-pointer font-medium text-[hsl(215,25%,15%)] m-0 leading-none"
            >
              Salvar endereço para futuras compras
            </Label>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {filtered.map((addr) => (
            <div
              key={addr.id}
              className={cn(
                'border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ease-out flex flex-col justify-between',
                selectedAddressId === addr.id
                  ? 'border-[hsl(152,68%,40%)] bg-[hsl(152,68%,95%)] shadow-[0_4px_12px_hsl(152,68%,10%)]'
                  : 'bg-[hsl(215,20%,96%)] border-[hsl(215,20%,90%)] hover:border-[hsl(152,68%,40%)]',
              )}
              onClick={() => {
                setSelectedAddressId(addr.id)
                setAddress({
                  street: addr.street,
                  number: addr.number,
                  complement: addr.complement || '',
                  city: addr.city,
                  state: addr.state,
                  zip_code: addr.zip_code,
                })
              }}
            >
              <div>
                <p
                  className={cn(
                    'font-bold mb-2',
                    selectedAddressId === addr.id
                      ? 'text-[hsl(152,68%,25%)]'
                      : 'text-[hsl(215,25%,15%)]',
                  )}
                >
                  {addr.street}, {addr.number}
                  {addr.complement && ` - ${addr.complement}`}
                </p>
                <p
                  className={cn(
                    'text-sm mb-4',
                    selectedAddressId === addr.id
                      ? 'text-[hsl(152,68%,35%)]'
                      : 'text-[hsl(215,25%,25%)]',
                  )}
                >
                  {addr.city}, {addr.state} - {addr.zip_code}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    selectedAddressId === addr.id
                      ? 'border-[hsl(152,68%,40%)]'
                      : 'border-[hsl(215,20%,90%)]',
                  )}
                >
                  {selectedAddressId === addr.id && (
                    <div className="w-2 h-2 bg-[hsl(152,68%,40%)] rounded-full" />
                  )}
                </div>
                <span
                  className={
                    selectedAddressId === addr.id
                      ? 'text-[hsl(152,68%,40%)]'
                      : 'text-[hsl(215,15%,45%)]'
                  }
                >
                  {selectedAddressId === addr.id ? 'Selecionado' : 'Usar este endereço'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setIsAddingNewAddress(true)
            setSelectedAddressId(null)
            setAddress({
              street: '',
              number: '',
              complement: '',
              city: '',
              state: '',
              zip_code: '',
            })
            if (deliveryMethod === 'miami')
              setAddress((a) => ({ ...a, city: 'Miami', state: 'FL' }))
            if (deliveryMethod === 'brasil')
              setAddress((a) => ({ ...a, city: 'Sao Paulo', state: 'SP' }))
          }}
          className={cn(btnSecondary, 'w-full sm:w-auto')}
        >
          Adicionar novo endereço
        </button>
      </div>
    )
  }

  const renderOrderSummary = () => (
    <div className="space-y-4">
      <div className="flex justify-between py-3 border-b border-slate-200 items-center">
        <span className="text-sm font-medium text-[hsl(215,15%,45%)]">Subtotal</span>
        <span className="text-base font-semibold text-[hsl(215,25%,15%)] font-mono">
          {formatCurrency(subtotal)}
        </span>
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between py-3 border-b border-slate-200 items-center">
          <span className="text-sm font-medium text-[hsl(215,15%,45%)]">Desconto</span>
          <span className="text-base font-semibold text-[hsl(152,68%,40%)] font-mono">
            -{formatCurrency(discountAmount)}
          </span>
        </div>
      )}

      {freight !== null && (
        <div className="flex justify-between py-3 border-b border-slate-200 items-center">
          <span className="text-sm font-medium text-[hsl(215,15%,45%)]">Frete</span>
          <span className="text-base font-semibold text-[hsl(215,25%,15%)] font-mono">
            {formatCurrency(freight)}
          </span>
        </div>
      )}

      <div className="flex justify-between py-4 border-b-2 border-slate-200 mt-2 items-center">
        <span className="font-bold text-[hsl(215,25%,15%)] text-base">Total</span>
        <span className="font-bold text-[hsl(152,68%,40%)] text-2xl font-mono tracking-tight">
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
          <StepWrapper
            step={1}
            currentStep={currentStep}
            title="Revisão do Carrinho"
            onStepClick={setCurrentStep}
          >
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
                    <div className="flex items-center border border-[hsl(215,20%,90%)] rounded-lg overflow-hidden bg-[hsl(215,20%,96%)]">
                      <button
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="px-4 py-2 hover:bg-[hsl(215,20%,90%)] transition-colors text-[hsl(215,25%,15%)] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(215,25%,15%)]"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 border-x border-[hsl(215,20%,90%)] font-semibold text-[hsl(215,25%,15%)] min-w-[3.5rem] text-center bg-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="px-4 py-2 hover:bg-[hsl(215,20%,90%)] transition-colors text-[hsl(215,25%,15%)] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(215,25%,15%)]"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold text-slate-900 w-28 text-right font-mono text-lg">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-2.5 text-[hsl(0,84%,60%)] hover:bg-red-50 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(0,84%,60%)]"
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
          <StepWrapper
            step={2}
            currentStep={currentStep}
            title="Seleção de Entrega"
            onStepClick={setCurrentStep}
          >
            <RadioGroup
              value={deliveryMethod}
              onValueChange={handleDeliveryChange}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {[
                { id: 'coleta', label: 'Coleta na Loja', desc: 'Retirada em Miami - Grátis' },
                { id: 'miami', label: 'Entrega em Miami', desc: 'Requer endereço completo' },
                { id: 'usa', label: 'Entrega EUA', desc: 'Requer ZIP code' },
                { id: 'brasil', label: 'Entrega Brasil (SP)', desc: 'Requer CEP válido' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleDeliveryChange(opt.id)}
                  className={cn(
                    'group border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ease-out',
                    deliveryMethod === opt.id
                      ? 'border-[hsl(152,68%,40%)] bg-[hsl(152,68%,95%)] shadow-[0_4px_12px_hsl(152,68%,10%)]'
                      : 'bg-[hsl(215,20%,96%)] border-[hsl(215,20%,90%)] hover:border-[hsl(152,68%,40%)]',
                  )}
                >
                  <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
                  <Label
                    htmlFor={opt.id}
                    className={cn(
                      'cursor-pointer block text-base font-semibold mb-2 transition-colors',
                      deliveryMethod === opt.id
                        ? 'text-[hsl(152,68%,25%)]'
                        : 'text-[hsl(215,25%,15%)]',
                    )}
                  >
                    {opt.label}
                  </Label>
                  <span
                    className={cn(
                      'block text-sm font-medium leading-snug m-0 transition-colors',
                      deliveryMethod === opt.id
                        ? 'text-[hsl(152,68%,35%)]'
                        : 'text-[hsl(215,25%,25%)]',
                    )}
                  >
                    {opt.desc}
                  </span>
                </div>
              ))}
            </RadioGroup>

            {deliveryMethod && deliveryMethod !== 'coleta' && (
              <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="text-lg font-bold text-[hsl(215,25%,15%)] mb-4">
                  Endereço de Entrega
                </h3>
                {renderAddresses()}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8">
              <button className={btnSecondary} onClick={() => setCurrentStep(1)}>
                Voltar
              </button>
              <button
                className={btnPrimary}
                onClick={handleCalculateFreightClick}
                disabled={
                  !deliveryMethod ||
                  isLoading ||
                  (deliveryMethod !== 'coleta' && !selectedAddressId && !isAddingNewAddress)
                }
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Calcular Frete
              </button>
            </div>
          </StepWrapper>

          {/* STEP 3 */}
          <StepWrapper
            step={3}
            currentStep={currentStep}
            title="Calcular Frete"
            onStepClick={setCurrentStep}
          >
            <div className="space-y-6">
              <div className="bg-[hsl(215,20%,96%)] p-4 rounded-xl border border-[hsl(215,20%,90%)] text-sm text-[hsl(215,25%,25%)]">
                <p>
                  <strong>Tipo de Entrega:</strong> {deliveryMethod.toUpperCase()}
                </p>
                {deliveryMethod !== 'coleta' && address.zip_code && (
                  <p className="mt-1">
                    <strong>Endereço:</strong> {address.street}, {address.number}{' '}
                    {address.complement && `- ${address.complement}`} - {address.city}/
                    {address.state} - ZIP/CEP: {address.zip_code}
                  </p>
                )}
                <p className="mt-2">
                  <strong>Resumo do Carrinho:</strong>{' '}
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)} item(s) -{' '}
                  {formatCurrency(subtotal)}
                </p>
              </div>

              {isCalculatingShipping ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(152,68%,40%)] mb-4" />
                  <p className="text-[hsl(215,25%,25%)] font-medium">Calculando frete...</p>
                </div>
              ) : shippingError ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl space-y-4">
                  <p className="text-red-800 font-medium">{shippingError}</p>

                  {shippingError.includes('perimetro maximo') && (
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      Voltar para Seleção de Modalidade
                    </button>
                  )}
                  {shippingError.includes('nao encontrado') && (
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      Editar Endereço
                    </button>
                  )}

                  {!shippingError.includes('perimetro maximo') &&
                    !shippingError.includes('nao encontrado') && (
                      <button
                        onClick={handleCalculateShippingAction}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                      >
                        Tentar Novamente
                      </button>
                    )}
                </div>
              ) : freight !== null ? (
                <div className="bg-[hsl(152,68%,95%)] border-l-4 border-[hsl(152,68%,40%)] p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-medium text-[hsl(215,25%,15%)]">Custo de frete:</p>
                    {shippingMessage && (
                      <p className="text-sm text-[hsl(152,68%,40%)] mt-1">{shippingMessage}</p>
                    )}
                  </div>
                  <p className="text-2xl font-bold font-mono text-[hsl(152,68%,40%)] shrink-0">
                    {formatCurrency(freight)}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4">
                <button
                  className={btnSecondary}
                  onClick={() => setCurrentStep(2)}
                  disabled={isCalculatingShipping}
                >
                  Voltar
                </button>
                {freight === null && !shippingError ? (
                  <button
                    className={btnPrimary}
                    onClick={handleCalculateShippingAction}
                    disabled={
                      isCalculatingShipping ||
                      !deliveryMethod ||
                      (deliveryMethod !== 'coleta' && !selectedAddressId && !isAddingNewAddress)
                    }
                  >
                    Calcular Frete
                  </button>
                ) : (
                  <button
                    className={btnPrimary}
                    onClick={() => setCurrentStep(4)}
                    disabled={isCalculatingShipping || freight === null || !!shippingError}
                  >
                    Continuar para Cupom
                  </button>
                )}
              </div>
            </div>
          </StepWrapper>

          {/* STEP 4 */}
          <StepWrapper
            step={4}
            currentStep={currentStep}
            title="Cupom de Desconto"
            onStepClick={setCurrentStep}
          >
            {appliedCoupon ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[hsl(152,68%,40%)] p-5 rounded-2xl shadow-lg shadow-[hsl(152,68%,10%)] gap-4">
                <div className="text-white">
                  <p className="font-bold text-lg mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Cupom Aplicado!
                  </p>
                  <p className="text-[hsl(152,68%,95%)] font-medium tracking-wide">
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
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-semibold text-sm border border-white/10 w-full sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
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
          <StepWrapper
            step={5}
            currentStep={currentStep}
            title="Seleção de Pagamento"
            onStepClick={setCurrentStep}
          >
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
                      ? 'border-[hsl(152,68%,40%)] bg-[hsl(152,68%,95%)] shadow-[0_4px_12px_hsl(152,68%,10%)]'
                      : 'bg-[hsl(215,20%,96%)] border-[hsl(215,20%,90%)] hover:border-[hsl(152,68%,40%)]',
                  )}
                >
                  <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
                  <div className="mb-4 transform transition-transform group-hover:scale-110 duration-300">
                    {opt.icon}
                  </div>
                  <Label
                    htmlFor={opt.id}
                    className={cn(
                      'cursor-pointer block text-lg font-bold mb-1 transition-colors',
                      paymentMethod === opt.id
                        ? 'text-[hsl(152,68%,25%)]'
                        : 'text-[hsl(215,25%,15%)]',
                    )}
                  >
                    {opt.label}
                  </Label>
                  <span
                    className={cn(
                      'block text-sm font-medium transition-colors',
                      paymentMethod === opt.id
                        ? 'text-[hsl(152,68%,35%)]'
                        : 'text-[hsl(215,25%,25%)]',
                    )}
                  >
                    {opt.desc}
                  </span>
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
                  className={cn(
                    btnPrimary,
                    'flex-1 text-lg py-4 shadow-lg shadow-[hsl(152,68%,10%)]',
                  )}
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
          <p className="text-sm font-semibold text-[hsl(215,15%,45%)] uppercase tracking-wider mb-0.5">
            Total a Pagar
          </p>
          <p className="text-2xl font-bold text-[hsl(152,68%,40%)] font-mono tracking-tight">
            {formatCurrency(total)}
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="text-[hsl(152,68%,40%)] bg-[hsl(152,68%,95%)] font-bold px-6 py-3 border-2 border-[hsl(152,68%,40%)] hover:bg-[hsl(152,68%,90%)] rounded-xl transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(152,68%,40%)]">
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
              className={cn(btnSecondary, 'py-4 px-6')}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={completeManualPayment}
              className={cn(btnPrimary, 'py-4 px-8 shadow-lg shadow-[hsl(152,68%,10%)]')}
            >
              Completei a Transferência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
