import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface CartItemDetail {
  id: string
  name: string
  price: number
  image_url: string
  quantity: number
  weight?: number
}

interface CartContextType {
  cartItems: CartItemDetail[]
  cartTotal: number
  itemCount: number
  isLoading: boolean
  error: string | null
  addToCart: (productId: string, quantity: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  getCartItems: () => CartItemDetail[]
  getCartTotal: () => number
  clearCart: () => Promise<void>
  syncLocalToSupabase: () => Promise<void>
  getItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser: user } = useAuthContext()
  const [cartItems, setCartItems] = useState<CartItemDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemsRef = useRef<CartItemDetail[]>([])
  useEffect(() => {
    itemsRef.current = cartItems
  }, [cartItems])

  const fetchProductDetails = async (items: { product_id: string; quantity: number }[]) => {
    if (items.length === 0) return []
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price_usd, image_url, weight')
        .in(
          'id',
          items.map((i) => i.product_id),
        )
      if (!data) return []
      return items
        .map((item) => {
          const p = data.find((d) => d.id === item.product_id)
          if (!p) return null
          return {
            id: p.id,
            name: p.name,
            price: p.price_usd || 0,
            image_url: p.image_url || '',
            quantity: item.quantity,
            weight: p.weight,
          }
        })
        .filter(Boolean) as CartItemDetail[]
    } catch (err) {
      console.error(err)
      return []
    }
  }

  const loadLocalCart = async () => {
    try {
      const local = localStorage.getItem('my-way-cart')
      const items = local ? JSON.parse(local) : []
      const details = await fetchProductDetails(items)
      setCartItems(details)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSupabaseCart = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', user.id)
      if (error) throw error
      const details = await fetchProductDetails(data || [])
      setCartItems(details)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const syncLocalToSupabase = async () => {
    if (!user) return
    const local = localStorage.getItem('my-way-cart')
    if (!local) return
    try {
      const items: any[] = JSON.parse(local)
      if (items.length === 0) return

      for (const item of items) {
        const { data: existing } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('product_id', item.product_id)
          .maybeSingle()
        if (existing) {
          await supabase
            .from('cart_items')
            .update({ quantity: Math.min(50, existing.quantity + item.quantity) })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('cart_items')
            .insert({ user_id: user.id, product_id: item.product_id, quantity: item.quantity })
        }
      }
      localStorage.removeItem('my-way-cart')
      await loadSupabaseCart()
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    let sub: any
    setIsLoading(true)
    if (user) {
      const local = localStorage.getItem('my-way-cart')
      if (local && JSON.parse(local).length > 0) {
        syncLocalToSupabase().then(() => {
          toast.success('Carrinho sincronizado!')
        })
      } else {
        loadSupabaseCart()
      }

      sub = supabase
        .channel('cart_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` },
          () => {
            loadSupabaseCart()
          },
        )
        .subscribe()
    } else {
      loadLocalCart()
    }
    return () => {
      if (sub) supabase.removeChannel(sub)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(
      async () => {
        const local = localStorage.getItem('my-way-cart')
        if (local && JSON.parse(local).length > 0) {
          await syncLocalToSupabase()
        }
      },
      5 * 60 * 1000,
    )
    return () => clearInterval(interval)
  }, [user])

  const saveLocalCart = (items: { product_id: string; quantity: number }[]) => {
    localStorage.setItem('my-way-cart', JSON.stringify(items))
    fetchProductDetails(items).then(setCartItems)
  }

  const addToCart = async (productId: string, quantity: number) => {
    if (user) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()
      if (existing) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: Math.min(50, existing.quantity + quantity) })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({ user_id: user.id, product_id: productId, quantity })
        if (error) throw error
      }
      await loadSupabaseCart()
    } else {
      const local = localStorage.getItem('my-way-cart')
      const items: any[] = local ? JSON.parse(local) : []
      const existing = items.find((i) => i.product_id === productId)
      if (existing) {
        existing.quantity = Math.min(50, existing.quantity + quantity)
      } else {
        items.push({ product_id: productId, quantity })
      }
      saveLocalCart(items)
    }
  }

  const removeFromCart = async (productId: string) => {
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
      if (error) throw error
      await loadSupabaseCart()
    } else {
      const local = localStorage.getItem('my-way-cart')
      let items: any[] = local ? JSON.parse(local) : []
      items = items.filter((i) => i.product_id !== productId)
      saveLocalCart(items)
    }
  }

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1 || quantity > 50) return
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId)
      if (error) throw error
      await loadSupabaseCart()
    } else {
      const local = localStorage.getItem('my-way-cart')
      let items: any[] = local ? JSON.parse(local) : []
      const existing = items.find((i) => i.product_id === productId)
      if (existing) {
        existing.quantity = quantity
        saveLocalCart(items)
      }
    }
  }

  const clearCart = async () => {
    if (user) {
      const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id)
      if (error) throw error
      await loadSupabaseCart()
    } else {
      localStorage.removeItem('my-way-cart')
      setCartItems([])
    }
  }

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartTotal,
        itemCount,
        isLoading,
        error,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncLocalToSupabase,
        getCartItems: () => itemsRef.current,
        getCartTotal: () =>
          itemsRef.current.reduce((acc, item) => acc + item.price * item.quantity, 0),
        getItemCount: () => itemsRef.current.reduce((acc, item) => acc + item.quantity, 0),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
