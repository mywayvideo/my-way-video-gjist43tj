import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/useCart'
import { useShippingConfig } from '@/hooks/useShippingConfig'
import { getApplicableDiscounts, getBestDiscount } from '@/services/discountApplicationService'
import { useStripePayment } from '@/hooks/useStripePayment'
import { useAlternativePayments } from '@/hooks/useAlternativePayments'
import { PaymentMethod, CustomerData } from '@/types/payment'
import {
  createPaymentIntent,
  confirmCardPayment,
  createOrderAfterPayment,
  clearCartFromLocalStorage,
  clearCartFromSupabase,
} from '@/services/stripeService'
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
  Copy,
} from 'lucide-react'
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

const CopyBtn = ({ text }: { text: string }) => {
  const { toast } = useToast()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        navigator.clipboard.writeText(text)
        toast({ description: 'Copiado para a área de transferência.' })
      }}
      className="p-2 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
      title="Copiar"
    >
      <Copy className="w-4 h-4" />
    </button>
  )
}

export default function Checkout() {
  const { user, loading } = useAuth()
  const cartContext = useCart() as any
  const { toast } = useToast()
  const navigate = useNavigate()

  const {
    isLoading: altIsLoading,
    setIsLoading: setAltIsLoading,
    validateShippingMethod,
    handlePayPalFlow,
    generateBankDepositDetailsUSA,
    generateZelleDetails,
    createPendingOrder,
    createTransferenciaBrasilOrder,
    createPIXOrder,
    getAvailablePaymentMethods,
  } = useAlternativePayments()

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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [tempOrderNumber, setTempOrderNumber] = useState(`ORD-${Date.now().toString().slice(-6)}`)

  const [customerData, setCustomerData] = useState<CustomerData>({
    nome: user?.user_metadata?.name || '',
    email: user?.email || '',
    telefone: '',
  })

  const paymentDetailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      setCustomerData((prev) => ({
        ...prev,
        nome: prev.nome || user.user_metadata?.name || '',
        email: prev.email || user.email || '',
      }))
    }
  }, [user])

  useEffect(() => {
    if (paymentMethod && paymentDetailsRef.current) {
      setTimeout(() => {
        paymentDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }, [paymentMethod])

  const [bankDetails, setBankDetails] = useState<any>(null)
  const [zelleEmail, setZelleEmail] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [orderConfirmed, setOrderConfirmed] = useState(false)

  const { warehouse } = useShippingConfig()
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([])

  const { mountCardElement, stripe, cardElement, unmountCardElement, isCardReady } =
    useStripePayment()

  const [stripeName, setStripeName] = useState('')
  const [stripeEmail, setStripeEmail] = useState('')

  const isGlobalLoading = isLoading || altIsLoading

  useEffect(() => {
    if (paymentMethod !== 'stripe' && unmountCardElement) {
      unmountCardElement()
    }
  }, [paymentMethod, unmountCardElement])

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
    if (user.email && !stripeEmail) {
      setStripeEmail(user.email)
    }
    fetchAddressesAndDiscounts()
  }, [user, loading, cartContext])

  const total = subtotal - discountAmount + (freight || 0)

  const fetchAddressesAndDiscounts = async () => {
    if (!user) return
    try {
      const [custRes, discRes, settingsRes] = await Promise.all([
        supabase.from('customers').select('id, role').eq('user_id', user.id).single(),
        supabase.from('discounts').select('*').eq('is_active', true),
        supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['transfer_usa_bank_details', 'zelle_email']),
      ])

      if (settingsRes.data) {
        const bankSetting = settingsRes.data.find(
          (s) => s.setting_key === 'transfer_usa_bank_details',
        )?.setting_value
        if (bankSetting) {
          try {
            setBankDetails(JSON.parse(bankSetting))
          } catch (e) {
            console.error('Error parsing bank details', e)
          }
        }
        const zelleSetting = settingsRes.data.find(
          (s) => s.setting_key === 'zelle_email',
        )?.setting_value
        if (zelleSetting) setZelleEmail(zelleSetting)
      }

      if (discRes.data) setActiveDiscounts(discRes.data)

      if (custRes.data) {
        setStripeName(custRes.data.full_name || '')
        setCustomerData({
          nome: custRes.data.full_name || user.user_metadata?.name || '',
          email: user.email || '',
          telefone: custRes.data.phone || '',
        })
        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', custRes.data.id)
          .eq('address_type', 'shipping')
        if (addresses) setSavedAddresses(addresses)
      }

      loadCart(discRes.data || [], custRes.data)
    } catch (e) {
      console.error('Error fetching init data:', e)
      loadCart([], null)
    }
  }

  const loadCart = async (discounts: any[] = [], customer: any = null) => {
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
        const formatted = await Promise.all(
          itemsArray.map(async (p: any) => {
            const prod = p.product || p
            let price = p.unit_price || prod.price_usd || prod.price || p.price_usd || p.price || 0

            let hasDiscount = false
            if (discounts.length > 0) {
              const { data: prodData } = await supabase
                .from('products')
                .select('price_cost')
                .eq('id', prod.id || p.product_id || p.id)
                .single()

              const bestDiscount = getBestDiscount(
                discounts,
                prod.id || p.product_id || p.id,
                customer?.id || null,
                customer?.role || null,
                price,
                prodData?.price_cost || 0,
              )
              if (bestDiscount.discountedPrice < price) {
                price = bestDiscount.discountedPrice
                hasDiscount = true
              }
            }

            return {
              id: p.id || prod.id,
              product_id: prod.id || p.product_id || p.id,
              name: prod.name || p.name,
              unit_price: price,
              quantity: p.quantity || 1,
              image_url: prod.image_url || p.image_url,
              weight: prod.weight || p.weight || 1,
              has_discount: hasDiscount,
            }
          }),
        )

        const hasNewDiscount = formatted.some((i) => i.has_discount)

        const currentIds = cartItems.map((i: any) => `${i.id}-${i.quantity}`).join(',')
        const newIds = formatted.map((i: any) => `${i.id}-${i.quantity}`).join(',')

        if (currentIds !== newIds) {
          setCartItems(formatted)
          calculateSubtotal(formatted)

          if (hasNewDiscount) {
            toast({
              title: 'Desconto Aplicado!',
              description:
                'Oba! Detectamos um novo desconto aplicável. O valor do carrinho foi atualizado!',
              variant: 'default',
              className: 'bg-emerald-600 text-white border-emerald-700',
            })
          }
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

  const getDBShippingMethod = (method: string) => {
    if (method === 'coleta') return 'miami_pickup'
    if (method === 'miami' || method === 'usa') return 'usa_cargo'
    if (method === 'brasil') return 'brazil_delivery'
    return 'usa_cargo'
  }

  const getFilteredAddresses = (method: string = deliveryMethod) => {
    const normalizeStr = (str: string | null) =>
      str
        ? str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
        : ''

    if (method === 'miami') {
      return savedAddresses.filter((a) => {
        const isBr = normalizeStr(a.country) === 'brasil' || normalizeStr(a.country) === 'brazil'
        if (isBr) return false

        if (!a.latitude || !a.longitude) {
          return normalizeStr(a.city) === 'miami' || normalizeStr(a.city) === 'coral gables'
        }

        const toRad = (value: number) => (value * Math.PI) / 180
        const R = 6371
        const lat1 = warehouse.latitude || 25.7617,
          lon1 = warehouse.longitude || -80.1918
        const lat2 = a.latitude,
          lon2 = a.longitude
        const dLat = toRad(lat2 - lat1)
        const dLon = toRad(lon2 - lon1)
        const distA =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const dist = R * (2 * Math.atan2(Math.sqrt(distA), Math.sqrt(1 - distA)))

        return dist <= 50
      })
    }
    if (method === 'usa') {
      return savedAddresses.filter((a) => {
        const isUs =
          normalizeStr(a.country) === 'usa' ||
          normalizeStr(a.country) === 'eua' ||
          normalizeStr(a.country) === 'estados unidos' ||
          normalizeStr(a.country) === 'united states'
        if (!isUs) return false

        if (!a.latitude || !a.longitude) {
          return normalizeStr(a.city) !== 'miami' && normalizeStr(a.city) !== 'coral gables'
        }

        const toRad = (value: number) => (value * Math.PI) / 180
        const R = 6371
        const lat1 = warehouse.latitude || 25.7617,
          lon1 = warehouse.longitude || -80.1918
        const lat2 = a.latitude,
          lon2 = a.longitude
        const dLat = toRad(lat2 - lat1)
        const dLon = toRad(lon2 - lon1)
        const distA =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const dist = R * (2 * Math.atan2(Math.sqrt(distA), Math.sqrt(1 - distA)))

        return dist > 50
      })
    }
    if (method === 'brasil') {
      return savedAddresses.filter(
        (a) =>
          (normalizeStr(a.country) === 'brasil' || normalizeStr(a.country) === 'brazil') &&
          normalizeStr(a.state) === 'sp',
      )
    }
    return []
  }

  const handleDeliveryChange = (val: string) => {
    setDeliveryMethod(val)
    setFreight(null)
    setPaymentMethod('')

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
      if (val === 'miami') setAddress((a) => ({ ...a, city: 'Coral Gables', state: 'FL' }))
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
              city: address.city || (deliveryMethod === 'miami' ? 'Coral Gables' : 'N/A'),
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
                city: address.city || (deliveryMethod === 'miami' ? 'Coral Gables' : 'N/A'),
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
          weight_lb: item.weight,
          quantity: item.quantity || 1,
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

  const ensureShippingAddress = async (customerId: string) => {
    if (deliveryMethod === 'coleta') return null
    if (selectedAddressId && !isAddingNewAddress) return selectedAddressId

    const { data: addrData, error } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: customerId,
        address_type: 'shipping',
        street: address.street || 'N/A',
        number: address.number || 'S/N',
        complement: address.complement || null,
        neighborhood: 'N/A',
        city: address.city || (deliveryMethod === 'miami' ? 'Coral Gables' : 'N/A'),
        state: address.state || (deliveryMethod === 'miami' ? 'FL' : 'N/A'),
        zip_code: address.zip_code || '00000',
        country: deliveryMethod === 'brasil' ? 'Brasil' : 'USA',
        is_default: saveNewAddress,
      })
      .select('id')
      .single()

    if (error) throw error
    return addrData?.id || null
  }

  const handleConfirmManualPayment = async () => {
    const dbShippingMethod = getDBShippingMethod(deliveryMethod)
    if (!validateShippingMethod(dbShippingMethod)) return

    setIsLoading(true)
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (!customer) throw new Error('Cliente não encontrado')

      const shippingAddressId = await ensureShippingAddress(customer.id)

      let order_id = ''
      let paymentData = null

      if (paymentMethod === 'transferencia_miami') {
        if (!bankDetails) {
          throw new Error('Dados bancarios nao configurados. Contate o administrador.')
        }
        paymentData = bankDetails
        const res = await createPendingOrder(
          customer.id,
          cartItems,
          paymentMethod as PaymentMethod,
          paymentData,
          dbShippingMethod,
          total,
          subtotal,
          discountAmount,
          freight,
          shippingAddressId,
          tempOrderNumber,
        )
        order_id = res.order_id
      } else if (paymentMethod === 'zelle') {
        if (!zelleEmail) {
          throw new Error('Email Zelle nao configurado. Contate o administrador.')
        }
        paymentData = { email: zelleEmail }
        const res = await createPendingOrder(
          customer.id,
          cartItems,
          paymentMethod as PaymentMethod,
          paymentData,
          dbShippingMethod,
          total,
          subtotal,
          discountAmount,
          freight,
          shippingAddressId,
          tempOrderNumber,
        )
        order_id = res.order_id
      } else if (paymentMethod === 'transferencia_brasil') {
        if (!customerData.nome || !customerData.email || !customerData.telefone) {
          throw new Error('Preencha nome, email e telefone para continuar.')
        }
        const res = await createTransferenciaBrasilOrder(
          customer.id,
          cartItems,
          customerData,
          dbShippingMethod,
          total,
          subtotal,
          discountAmount,
          freight,
          shippingAddressId,
          tempOrderNumber,
        )
        order_id = res.order_id

        supabase.functions.invoke('notify-admin-transferencia-brasil', {
          body: {
            orderId: order_id,
            orderNumber: tempOrderNumber,
            customerName: customerData.nome,
            customerEmail: customerData.email,
            customerPhone: customerData.telefone,
            amount: total,
            currency: 'USD',
          },
        })
      } else if (paymentMethod === 'pix') {
        if (!customerData.nome || !customerData.email || !customerData.telefone) {
          throw new Error('Preencha nome, email e telefone para continuar.')
        }
        const res = await createPIXOrder(
          customer.id,
          cartItems,
          customerData,
          dbShippingMethod,
          total,
          subtotal,
          discountAmount,
          freight,
          shippingAddressId,
          tempOrderNumber,
        )
        order_id = res.order_id

        supabase.functions.invoke('notify-admin-pix', {
          body: {
            orderId: order_id,
            orderNumber: tempOrderNumber,
            customerName: customerData.nome,
            customerEmail: customerData.email,
            customerPhone: customerData.telefone,
            amount: total,
          },
        })
      }

      if (cartContext?.clearCart) cartContext.clearCart()
      localStorage.removeItem('cart')
      setCreatedOrderId(order_id)
      setOrderConfirmed(true)

      if (paymentMethod === 'transferencia_brasil') {
        toast({ description: 'Pedido criado! Dados bancários serão enviados por email.' })
      } else if (paymentMethod === 'pix') {
        toast({ description: 'Pedido criado! Dados PIX serão enviados por email.' })
      } else {
        toast({ description: 'Pedido criado! Aguardando confirmação do pagamento.' })
      }
    } catch (err: any) {
      toast({
        description: err.message || 'Erro ao processar pedido. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayPalSubmit = async () => {
    const dbShippingMethod = getDBShippingMethod(deliveryMethod)
    if (!validateShippingMethod(dbShippingMethod)) return

    setIsLoading(true)
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (!customer) throw new Error('Cliente não encontrado')

      const shippingAddressId = await ensureShippingAddress(customer.id)

      const { order_id } = await createPendingOrder(
        customer.id,
        cartItems,
        'paypal',
        null,
        dbShippingMethod,
        total,
        subtotal,
        discountAmount,
        freight,
        shippingAddressId,
        tempOrderNumber,
      )

      await handlePayPalFlow(total, stripeEmail || user!.email || '', order_id)
    } catch (err: any) {
      toast({ description: err.message || 'Erro ao criar pedido PayPal.', variant: 'destructive' })
      setIsLoading(false)
    }
  }

  const handleStripeSubmit = async () => {
    setIsLoading(true)
    try {
      const dbShippingMethod = getDBShippingMethod(deliveryMethod)
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (!customer) throw new Error('Cliente não encontrado')

      const shippingAddressId = await ensureShippingAddress(customer.id)

      if (!isCardReady) {
        throw new Error('Aguarde o carregamento do formulário de cartão')
      }

      const { client_secret } = await createPaymentIntent(
        Math.round(total * 100),
        'usd',
        stripeEmail,
        stripeName,
        tempOrderNumber,
      )

      if (stripe && cardElement && client_secret && isCardReady) {
        const paymentIntent = await confirmCardPayment(
          stripe,
          client_secret,
          cardElement,
          stripeName,
          stripeEmail,
        )

        if (paymentIntent) {
          await createOrderAfterPayment(
            paymentIntent.id,
            total,
            cartItems,
            stripeEmail,
            user!.id,
            shippingAddressId,
            dbShippingMethod,
            freight || null,
            discountAmount,
          )

          clearCartFromLocalStorage()
          await clearCartFromSupabase(user!.id)
          if (cartContext?.clearCart) cartContext.clearCart()

          toast({
            description: 'Pagamento confirmado! Redirecionando para pedidos...',
            className: 'bg-emerald-600 text-white border-emerald-700',
          })

          setTimeout(() => {
            navigate('/dashboard')
          }, 1000)
        }
      }
    } catch (err: any) {
      toast({
        description: err.message || 'Nao foi possivel processar pagamento. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPaymentOptions = () => {
    const dbShippingMethod = getDBShippingMethod(deliveryMethod)
    const availableIds = getAvailablePaymentMethods(dbShippingMethod)

    const allOptions = [
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

    return allOptions.filter((opt) => availableIds.includes(opt.id as PaymentMethod))
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
              setAddress((a) => ({ ...a, city: 'Coral Gables', state: 'FL' }))
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

  const renderManualPaymentDetails = () => {
    if (paymentMethod === 'transferencia_brasil' || paymentMethod === 'pix') {
      const isPix = paymentMethod === 'pix'
      return (
        <div
          ref={paymentDetailsRef}
          className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6 space-y-4 animate-in fade-in duration-300"
        >
          <h4 className="font-bold text-lg text-slate-900">
            {isPix ? 'Pagamento via PIX' : 'Transferência (Brasil)'}
          </h4>
          <p className="text-sm text-slate-600 mb-4">
            {isPix
              ? 'Dados PIX serão enviados por email após confirmação do pedido.'
              : 'Dados bancários serão enviados por email após confirmação do pedido.'}
          </p>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-900 font-semibold mb-1 block">Nome Completo *</Label>
              <Input
                value={customerData.nome}
                onChange={(e) => setCustomerData({ ...customerData, nome: e.target.value })}
                placeholder="Seu nome completo"
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-slate-900 font-semibold mb-1 block">Email *</Label>
              <Input
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                type="email"
                placeholder="seu@email.com"
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-slate-900 font-semibold mb-1 block">Telefone *</Label>
              <Input
                value={customerData.telefone || ''}
                onChange={(e) => setCustomerData({ ...customerData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">
                NÚMERO DO PEDIDO
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={tempOrderNumber}
                  readOnly
                  className="bg-white font-mono font-bold flex-1"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    navigator.clipboard.writeText(tempOrderNumber)
                    toast({ description: 'Numero do pedido copiado para a area de transferencia.' })
                  }}
                  className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-bold text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                  Copiar Numero do Pedido
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-2 font-medium">
                {isPix
                  ? 'Inclua este numero na descricao do seu PIX para que possamos identificar seu pedido.'
                  : 'Inclua este numero na descricao da sua transferencia bancaria para que possamos identificar seu pedido.'}
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (paymentMethod === 'transferencia_miami') {
      const details = bankDetails || {}

      const formattedBlock = `DADOS BANCARIOS PARA TRANSFERENCIA
=====================================
Banco: ${details.bank_name || ''}
Conta: ${details.account_number || ''}
Routing: ${details.routing_number || ''}
Titular: ${details.account_holder || ''}
SWIFT: ${details.swift_code || ''}
Numero do Pedido: ${tempOrderNumber}
Valor: ${formatCurrency(total)}
=====================================`

      return (
        <div
          ref={paymentDetailsRef}
          className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6 space-y-4 animate-in fade-in duration-300"
        >
          <h4 className="font-bold text-lg text-slate-900">Dados para Depósito (EUA)</h4>

          <pre className="bg-white border border-slate-200 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap text-slate-700">
            {formattedBlock}
          </pre>

          <button
            onClick={(e) => {
              e.preventDefault()
              navigator.clipboard.writeText(formattedBlock)
              toast({ description: 'Dados copiados para a area de transferencia' })
            }}
            className={cn(btnSecondary, 'w-full text-sm font-bold')}
          >
            Copiar Dados Bancarios
          </button>

          <div className="space-y-3 mt-6">
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Valor a Transferir
              </Label>
              <Input
                value={formatCurrency(total)}
                readOnly
                className="bg-emerald-50 border-emerald-200 font-mono font-bold text-emerald-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                NÚMERO DO PEDIDO
              </Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Input
                  value={tempOrderNumber}
                  readOnly
                  className="bg-white font-mono font-bold flex-1"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    navigator.clipboard.writeText(tempOrderNumber)
                    toast({ description: 'Numero do pedido copiado para a area de transferencia.' })
                  }}
                  className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-bold text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                  Copiar Numero do Pedido
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-4 leading-relaxed font-medium">
              Favor transferir o valor acima. Seu pedido sera processado apos confirmacao do
              deposito.
            </p>
          </div>
        </div>
      )
    }

    if (paymentMethod === 'zelle') {
      return (
        <div
          ref={paymentDetailsRef}
          className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6 space-y-4 animate-in fade-in duration-300 text-center"
        >
          <h4 className="font-bold text-lg text-slate-900">Pagamento via Zelle</h4>

          <div className="max-w-md mx-auto space-y-4 text-left mt-4">
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Email Zelle
              </Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Input
                  value={zelleEmail || ''}
                  readOnly
                  className="bg-white font-mono text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    navigator.clipboard.writeText(zelleEmail || '')
                    toast({ description: 'Email copiado para a area de transferencia' })
                  }}
                  className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-bold text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                  Copiar Email Zelle
                </button>
              </div>
            </div>
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Valor a Transferir
              </Label>
              <Input
                value={formatCurrency(total)}
                readOnly
                className="bg-emerald-50 border-emerald-200 font-mono font-bold text-emerald-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                NÚMERO DO PEDIDO
              </Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Input
                  value={tempOrderNumber}
                  readOnly
                  className="bg-white font-mono font-bold flex-1"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    navigator.clipboard.writeText(tempOrderNumber)
                    toast({ description: 'Numero do pedido copiado para a area de transferencia.' })
                  }}
                  className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-bold text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                  Copiar Numero do Pedido
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-4 leading-relaxed font-medium">
              Use o email acima para enviar o pagamento via Zelle. Inclua o numero do pedido na
              descricao da transferencia.
            </p>
          </div>
        </div>
      )
    }

    return null
  }

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
            Seu pedido foi recebido com sucesso e está aguardando a confirmação do pagamento. Você
            será notificado assim que o processo for concluído.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/dashboard')} className={cn(btnPrimary, 'w-full')}>
              Acompanhar Pedido
            </button>
            <button onClick={() => navigate('/')} className={cn(btnSecondary, 'w-full')}>
              Voltar à Loja
            </button>
          </div>
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
              onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {getPaymentOptions().map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id as PaymentMethod)}
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

            {renderManualPaymentDetails()}

            {paymentMethod === 'stripe' && (
              <div
                ref={paymentDetailsRef}
                className="bg-[hsl(215,20%,96%)] p-6 rounded-xl border border-[hsl(215,20%,90%)] mt-6 animate-in fade-in duration-300 space-y-5"
              >
                <div>
                  <Label className="text-[hsl(215,25%,15%)] font-semibold">Nome no Cartão</Label>
                  <Input
                    value={stripeName}
                    onChange={(e) => setStripeName(e.target.value)}
                    className={inputClass}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label className="text-[hsl(215,25%,15%)] font-semibold">Email</Label>
                  <Input
                    type="email"
                    value={stripeEmail}
                    onChange={(e) => setStripeEmail(e.target.value)}
                    className={inputClass}
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <Label className="text-[hsl(215,25%,15%)] font-semibold">Dados do Cartão</Label>
                  <div
                    ref={mountCardElement}
                    className="bg-white border-2 border-[hsl(215,20%,90%)] rounded-lg p-4 mt-1 min-h-[56px]"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8">
              <button className={btnSecondary} onClick={() => setCurrentStep(4)}>
                Voltar
              </button>
              <button
                className={btnPrimary}
                onClick={() => {
                  if (paymentMethod === 'stripe') handleStripeSubmit()
                  else if (paymentMethod === 'paypal') handlePayPalSubmit()
                  else handleConfirmManualPayment()
                }}
                disabled={
                  !paymentMethod ||
                  isGlobalLoading ||
                  (paymentMethod === 'stripe' &&
                    (!isCardReady || stripeName.length < 5 || !stripeEmail.includes('@')))
                }
              >
                {isGlobalLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                {paymentMethod === 'paypal'
                  ? 'Pagar com PayPal'
                  : paymentMethod === 'zelle'
                    ? 'Confirmar Pagamento Zelle'
                    : paymentMethod === 'pix'
                      ? 'Confirmar Pagamento PIX'
                      : paymentMethod.startsWith('transferencia')
                        ? 'Confirmar Depósito'
                        : 'Confirmar Pedido'}
              </button>
            </div>
          </StepWrapper>
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
    </div>
  )
}
