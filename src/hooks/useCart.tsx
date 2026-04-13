import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthState } from '@/hooks/useAuthState'
import { toast } from '@/hooks/use-toast'

export interface CartItem {
  id: string
  product_id?: string
  name: string
  price: number
  quantity: number
  image_url?: string
  currency?: string
  price_usa?: number
  price_nationalized_sales?: number
  price_nationalized_currency?: string
  weight?: number | string
}

interface CartContextType {
  cartItems: CartItem[]
  cartTotal: number
  isLoading: boolean
  error: string | null
  addToCart: (productId: string, quantity: number, productDetails?: any) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthState()

  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true)
      try {
        const localCart = localStorage.getItem('mw-video-cart-v2')
        let items: CartItem[] = localCart ? JSON.parse(localCart) : []

        if (user) {
          const { data: cartData } = await supabase
            .from('shopping_carts')
            .select('id')
            .eq('customer_id', user.id)
            .maybeSingle()

          let cartId = cartData?.id
          if (!cartId) {
            const { data: newCart } = await supabase
              .from('shopping_carts')
              .insert({ customer_id: user.id })
              .select('id')
              .single()
            cartId = newCart?.id
          }

          if (cartId) {
            const { data: dbItems } = await supabase
              .from('cart_items')
              .select(
                'id, product_id, quantity, products(name, price_usd, price_brl, image_url, price_nationalized_sales, price_nationalized_currency, weight)',
              )
              .eq('cart_id', cartId)

            if (dbItems) {
              items = dbItems.map((item) => ({
                id: item.product_id,
                name: (item.products as any)?.name || '',
                price: (item.products as any)?.price_usd || 0,
                quantity: item.quantity,
                image_url: (item.products as any)?.image_url,
                price_usa: (item.products as any)?.price_usd,
                price_nationalized_sales: (item.products as any)?.price_nationalized_sales,
                price_nationalized_currency: (item.products as any)?.price_nationalized_currency,
                weight: (item.products as any)?.weight,
              }))
            }
          }
        }
        setCartItems(items)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadCart()
  }, [user])

  const saveLocalCart = (items: CartItem[]) => {
    localStorage.setItem('mw-video-cart-v2', JSON.stringify(items))
    setCartItems(items)
  }

  const addToCart = async (productId: string, quantity: number, productDetails?: any) => {
    try {
      let itemToAdd: CartItem

      if (productDetails) {
        itemToAdd = {
          id: productId,
          quantity,
          name: productDetails.name,
          price: productDetails.price_usd || 0,
          image_url: productDetails.image_url,
          price_usa: productDetails.price_usd,
          price_nationalized_sales: productDetails.price_nationalized_sales,
          price_nationalized_currency: productDetails.price_nationalized_currency,
          weight: productDetails.weight,
        }
      } else {
        const { data: prod } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()
        if (!prod) throw new Error('Product not found')
        itemToAdd = {
          id: productId,
          quantity,
          name: prod.name,
          price: prod.price_usd || 0,
          image_url: prod.image_url,
          price_usa: prod.price_usd,
          price_nationalized_sales: prod.price_nationalized_sales,
          price_nationalized_currency: prod.price_nationalized_currency,
          weight: prod.weight,
        }
      }

      setCartItems((prev) => {
        const existing = prev.find((i) => i.id === productId)
        let newItems
        if (existing) {
          newItems = prev.map((i) =>
            i.id === productId ? { ...i, quantity: i.quantity + quantity } : i,
          )
        } else {
          newItems = [...prev, itemToAdd]
        }
        saveLocalCart(newItems)
        return newItems
      })

      if (user) {
        const { data: cartData } = await supabase
          .from('shopping_carts')
          .select('id')
          .eq('customer_id', user.id)
          .maybeSingle()
        if (cartData) {
          const { data: existingDb } = await supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('cart_id', cartData.id)
            .eq('product_id', productId)
            .maybeSingle()
          if (existingDb) {
            await supabase
              .from('cart_items')
              .update({ quantity: existingDb.quantity + quantity })
              .eq('id', existingDb.id)
          } else {
            await supabase
              .from('cart_items')
              .insert({ cart_id: cartData.id, product_id: productId, quantity })
          }
        }
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
      throw e
    }
  }

  const removeFromCart = async (productId: string) => {
    setCartItems((prev) => {
      const newItems = prev.filter((i) => i.id !== productId)
      saveLocalCart(newItems)
      return newItems
    })

    if (user) {
      const { data: cartData } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', user.id)
        .maybeSingle()
      if (cartData) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cartData.id)
          .eq('product_id', productId)
      }
    }
  }

  const updateQuantity = async (productId: string, quantity: number) => {
    setCartItems((prev) => {
      const newItems = prev.map((i) => (i.id === productId ? { ...i, quantity } : i))
      saveLocalCart(newItems)
      return newItems
    })

    if (user) {
      const { data: cartData } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', user.id)
        .maybeSingle()
      if (cartData) {
        await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('cart_id', cartData.id)
          .eq('product_id', productId)
      }
    }
  }

  const clearCart = async () => {
    saveLocalCart([])
    if (user) {
      const { data: cartData } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', user.id)
        .maybeSingle()
      if (cartData) {
        await supabase.from('cart_items').delete().eq('cart_id', cartData.id)
      }
    }
  }

  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartTotal,
        isLoading,
        error,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
