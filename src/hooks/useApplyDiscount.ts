import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Discount } from '@/types/discount'
import { getBestDiscount, DiscountCalculation } from '@/services/discountApplicationService'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

// Global state cache to prevent redundant fetches
let globalDiscounts: Discount[] = []
let isFetching = false
let fetchPromise: Promise<void> | null = null
let subscriptionSetup = false
const listeners = new Set<() => void>()

const notifyListeners = () => listeners.forEach((l) => l())

const fetchDiscounts = async () => {
  if (isFetching) return fetchPromise
  isFetching = true
  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (!error && data) {
        globalDiscounts = data as Discount[]
        notifyListeners()
      }
    } catch (err) {
      console.error('Error fetching discounts:', err)
    } finally {
      isFetching = false
    }
  })()
  return fetchPromise
}

const setupRealtime = () => {
  if (subscriptionSetup) return
  subscriptionSetup = true

  fetchDiscounts()

  let debounceTimer: NodeJS.Timeout
  const debouncedFetch = () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      fetchDiscounts()
    }, 300)
  }

  supabase
    .channel('public:discounts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'discounts' }, () =>
      debouncedFetch(),
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Realtime subscription failed', err)
        toast({ title: 'Erro', description: 'Erro ao carregar descontos.', variant: 'destructive' })
      }
    })
}

export function useApplyDiscount(
  productId?: string,
  originalPrice?: number | null,
  costPrice?: number | null,
) {
  const { user } = useAuth()
  const [discounts, setDiscounts] = useState<Discount[]>(globalDiscounts)

  useEffect(() => {
    setupRealtime()
    const handleUpdate = () => setDiscounts([...globalDiscounts])
    listeners.add(handleUpdate)
    if (globalDiscounts.length === 0) fetchDiscounts()

    return () => {
      listeners.delete(handleUpdate)
    }
  }, [])

  const userRole = user?.app_metadata?.role || user?.user_metadata?.role || 'customer'

  const calculate = useCallback(
    (pId: string, pPrice: number, cPrice: number): DiscountCalculation => {
      return getBestDiscount(discounts, pId, user?.id || null, userRole, pPrice, cPrice)
    },
    [discounts, user?.id, userRole],
  )

  const result = useMemo(() => {
    if (!productId || originalPrice == null || originalPrice <= 0) {
      return {
        originalPrice: originalPrice || 0,
        discountedPrice: originalPrice || 0,
        discountPercentage: 0,
        ruleName: null,
        discountType: null,
      }
    }
    return calculate(productId, originalPrice, costPrice || 0)
  }, [productId, originalPrice, costPrice, calculate])

  return {
    ...result,
    calculateDiscount: calculate,
  }
}
