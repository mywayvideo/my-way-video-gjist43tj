import { useSyncExternalStore, ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  image_url?: string
  quantity: number
}

class CartStore {
  private items: CartItem[] = []
  private listeners: Set<() => void> = new Set()

  constructor() {
    try {
      const stored = localStorage.getItem('mw-video-cart')
      if (stored) {
        this.items = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load cart', e)
    }
  }

  private notify() {
    try {
      localStorage.setItem('mw-video-cart', JSON.stringify(this.items))
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e)
    }
    this.listeners.forEach((l) => l())
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.items

  addItem = (item: CartItem) => {
    const existing = this.items.find((i) => i.id === item.id)
    if (existing) {
      this.items = this.items.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i,
      )
    } else {
      this.items = [...this.items, item]
    }
    this.notify()
  }

  removeItem = (id: string) => {
    this.items = this.items.filter((i) => i.id !== id)
    this.notify()
  }

  updateQuantity = (id: string, quantity: number) => {
    this.items = this.items.map((i) => (i.id === id ? { ...i, quantity } : i))
    this.notify()
  }

  clearCart = () => {
    this.items = []
    this.notify()
  }
}

const cartStore = new CartStore()

export function useCartStore() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot)

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    items,
    addItem: cartStore.addItem,
    removeItem: cartStore.removeItem,
    updateQuantity: cartStore.updateQuantity,
    clearCart: cartStore.clearCart,
    totalItems,
    totalPrice,
  }
}

// Dummy provider for backward compatibility
export function CartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
