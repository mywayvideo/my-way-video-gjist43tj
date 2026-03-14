import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Product } from '@/lib/mockData'
import { toast } from '@/hooks/use-toast'

interface CartItem {
  product: Product
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  itemCount: number
}

const CartContext = createContext<CartStore | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    toast({
      title: 'Adicionado ao carrinho',
      description: `${product.name} foi adicionado.`,
    })
  }

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0)

  return React.createElement(
    CartContext.Provider,
    { value: { items, addItem, itemCount } },
    children,
  )
}

export function useCartStore() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCartStore must be used within a CartProvider')
  }
  return context
}
