import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface CartItem {
  id: string
  product_id: string
  quantity: number
  product?: any
}

interface CartContextType {
  items: CartItem[]
  addToCart: (productId: string, quantity?: number) => Promise<void>
  removeFromCart: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  isLoading: boolean
  totalItems: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    // SECURITY ISOLATION: Do not fetch cart on home page to avoid 403 errors
    if (window.location.pathname === '/') {
      return
    }

    if (user) {
      fetchCart()
    } else {
      setItems([])
    }
  }, [user])

  const fetchCart = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const { data: cart } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', user.id)
        .maybeSingle()

      if (cart) {
        const { data: cartItems } = await supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('cart_id', cart.id)

        if (cartItems) setItems(cartItems)
      }
    } catch (e) {
      console.error('Error fetching cart:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) return
    setIsLoading(true)
    try {
      let cartId = ''
      const { data: cart } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', user.id)
        .maybeSingle()

      if (cart) {
        cartId = cart.id
      } else {
        const { data: newCart } = await supabase
          .from('shopping_carts')
          .insert({ customer_id: user.id })
          .select('id')
          .single()
        if (newCart) cartId = newCart.id
      }

      if (cartId) {
        const existingItem = items.find((i) => i.product_id === productId)
        if (existingItem) {
          await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + quantity })
            .eq('id', existingItem.id)
        } else {
          await supabase
            .from('cart_items')
            .insert({ cart_id: cartId, product_id: productId, quantity, user_id: user.id })
        }
        await fetchCart()
      }
    } catch (e) {
      console.error('Error adding to cart:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromCart = async (itemId: string) => {
    setIsLoading(true)
    try {
      await supabase.from('cart_items').delete().eq('id', itemId)
      setItems(items.filter((i) => i.id !== itemId))
    } catch (e) {
      console.error('Error removing from cart:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId)
      return
    }
    setIsLoading(true)
    try {
      await supabase.from('cart_items').update({ quantity }).eq('id', itemId)
      setItems(items.map((i) => (i.id === itemId ? { ...i, quantity } : i)))
    } catch (e) {
      console.error('Error updating quantity:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const clearCart = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const { data: cart } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', user.id)
        .maybeSingle()

      if (cart) {
        await supabase.from('cart_items').delete().eq('cart_id', cart.id)
        setItems([])
      }
    } catch (e) {
      console.error('Error clearing cart:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, isLoading, totalItems }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
