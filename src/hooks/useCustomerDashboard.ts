import { useState, useEffect, useCallback } from 'react'
import { customerService } from '@/services/customerService'
import { useAuth } from '@/hooks/use-auth'
import { Customer, Order, Favorite, CartItem, DiscountRuleCustomer } from '@/types/customer'

export function useCustomerDashboard() {
  const { user: authUser } = useAuth()

  const [user, setUser] = useState<Customer | null>(null)
  const [activeTab, setActiveTab] = useState('resumo')
  const [orders, setOrders] = useState<Order[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [discounts, setDiscounts] = useState<DiscountRuleCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!authUser) return
    setLoading(true)
    setError(null)
    try {
      const profile = await customerService.fetchCustomerData(authUser.id)
      setUser(profile)
      if (profile) {
        const [ords, favs, crts, discs] = await Promise.all([
          customerService.fetchOrders(profile.id, 1, 10),
          customerService.fetchFavorites(profile.id),
          customerService.fetchCartItems(profile.id),
          customerService.fetchDiscounts(profile.id),
        ])
        setOrders(ords)
        setFavorites(favs)
        setCart(crts)
        setDiscounts(discs)
      }
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível carregar os dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [authUser])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    user,
    activeTab,
    setActiveTab,
    orders,
    favorites,
    cart,
    discounts,
    loading,
    error,
    refresh: loadData,
  }
}
