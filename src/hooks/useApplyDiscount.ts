import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Discount } from '@/types/discount'
import { getBestDiscount, DiscountCalculation } from '@/services/discountApplicationService'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

// Global state cache to prevent redundant fetches
let globalDiscounts: Discount[] = []
let isFetching = false
let fetchPromise: Promise<void> | null = null
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

export function useApplyDiscount(
  productId?: string,
  originalPrice?: number | null,
  costPrice?: number | null,
) {
  const { user } = useAuth()
  const [discounts, setDiscounts] = useState<Discount[]>(globalDiscounts)

  const subscriptionRef = useRef<any>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retriesRef = useRef(0)
  const isSubscribingRef = useRef(false)

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout

    const handleUpdate = () => setDiscounts([...globalDiscounts])
    listeners.add(handleUpdate)

    if (globalDiscounts.length === 0) {
      fetchDiscounts()
    }

    const setupSubscription = () => {
      if (isSubscribingRef.current) return
      isSubscribingRef.current = true

      console.log('Setting up Realtime subscription for discounts...')

      const channel = supabase.channel(
        `public:discounts:${Math.random().toString(36).substring(7)}`,
      )

      subscriptionRef.current = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'discounts' }, () => {
          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            fetchDiscounts()
          }, 300)
        })
        .subscribe((status, err) => {
          isSubscribingRef.current = false
          if (status === 'SUBSCRIBED') {
            retriesRef.current = 0
            console.log('Realtime subscription successful.')
          }
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.error('Realtime subscription failed:', err || status)
            handleSubscriptionError()
          }
        })
    }

    const handleSubscriptionError = () => {
      if (subscriptionRef.current) {
        if (typeof subscriptionRef.current.unsubscribe === 'function') {
          subscriptionRef.current.unsubscribe()
        }
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }

      if (retriesRef.current < 3) {
        retriesRef.current += 1
        console.log(
          `Retrying Realtime subscription in 3 seconds... (Attempt ${retriesRef.current} of 3)`,
        )
        retryTimeoutRef.current = setTimeout(() => {
          setupSubscription()
        }, 3000)
      } else {
        if (retriesRef.current === 3) {
          console.error('Realtime subscription failed after 3 retries.')
          toast({
            title: 'Erro',
            description: 'Erro ao sincronizar descontos.',
            variant: 'destructive',
          })
          toast({
            title: 'Aviso',
            description: 'Sincronizacao em modo compatibilidade.',
            variant: 'default',
          })
          retriesRef.current += 1 // Increment to avoid multiple toasts
        }
        startPolling()
      }
    }

    const startPolling = () => {
      if (pollingRef.current) return
      console.log('Fallback to REST API polling active.')
      pollingRef.current = setInterval(() => {
        fetchDiscounts()
      }, 5000)
    }

    setupSubscription()

    return () => {
      listeners.delete(handleUpdate)
      if (debounceTimer) clearTimeout(debounceTimer)

      if (subscriptionRef.current) {
        if (typeof subscriptionRef.current.unsubscribe === 'function') {
          subscriptionRef.current.unsubscribe()
        }
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [])

  const userRole = user?.app_metadata?.role || user?.user_metadata?.role || 'customer'

  const calculate = useCallback(
    (pId: string, pPrice: number, cPrice: number): DiscountCalculation => {
      try {
        return getBestDiscount(discounts, pId, user?.id || null, userRole, pPrice, cPrice)
      } catch (error) {
        console.error('Error calculating discount:', error)
        return {
          originalPrice: pPrice,
          discountedPrice: pPrice,
          discountPercentage: 0,
          ruleName: null,
          discountType: null,
        }
      }
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
