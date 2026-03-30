import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { discountService } from '@/services/discountService'
import { DiscountRule } from '@/types/discount'

let globalCustomerCache: { id: string; role: string } | null = null
let globalCustomerPromise: Promise<any> | null = null

async function getCustomerContext() {
  if (globalCustomerCache) return globalCustomerCache
  if (globalCustomerPromise) return globalCustomerPromise

  globalCustomerPromise = (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data: customer } = await supabase
        .from('customers')
        .select('id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (customer) {
        globalCustomerCache = { id: customer.id, role: customer.role }
        return globalCustomerCache
      }
    } catch (err) {
      console.error('Error fetching customer context', err)
    } finally {
      globalCustomerPromise = null
    }
    return null
  })()

  return globalCustomerPromise
}

let isRealtimeSubscribed = false
const listeners = new Set<() => void>()

function subscribeToDiscountRules() {
  if (isRealtimeSubscribed) return
  isRealtimeSubscribed = true

  supabase
    .channel('discount_rules_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'discount_rules' }, () => {
      discountService.clearCache()
      listeners.forEach((listener) => listener())
    })
    .subscribe()

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      globalCustomerCache = null
      discountService.clearCache()
      setTimeout(() => {
        listeners.forEach((listener) => listener())
      }, 300)
    }
  })
}

export function useProductDiscount(product: any) {
  const [discountInfo, setDiscountInfo] = useState({
    originalPrice: product?.price_usd || 0,
    discountedPrice: null as number | null,
    discountPercentage: null as number | null,
    discountAmount: null as number | null,
    appliedRule: null as DiscountRule | null,
    loading: true,
  })

  useEffect(() => {
    subscribeToDiscountRules()
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const calculate = async () => {
      if (!product || product.price_usd == null) {
        if (isMounted) {
          setDiscountInfo({
            originalPrice: product?.price_usd || 0,
            discountedPrice: null,
            discountPercentage: null,
            discountAmount: null,
            appliedRule: null,
            loading: false,
          })
        }
        return
      }

      if (isMounted) setDiscountInfo((prev) => ({ ...prev, loading: true }))

      try {
        const customer = await getCustomerContext()
        if (!customer) {
          if (isMounted) {
            setDiscountInfo({
              originalPrice: product.price_usd,
              discountedPrice: null,
              discountPercentage: null,
              discountAmount: null,
              appliedRule: null,
              loading: false,
            })
          }
          return
        }

        const info = await discountService.calculateBestDiscount(
          product,
          customer.role,
          customer.id,
        )
        if (isMounted) {
          setDiscountInfo({ ...info, loading: false })
        }
      } catch (err) {
        if (isMounted) {
          setDiscountInfo({
            originalPrice: product.price_usd,
            discountedPrice: null,
            discountPercentage: null,
            discountAmount: null,
            appliedRule: null,
            loading: false,
          })
        }
      }
    }

    calculate()

    const listener = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        calculate()
      }, 300)
    }

    listeners.add(listener)

    return () => {
      isMounted = false
      listeners.delete(listener)
      clearTimeout(timeoutId)
    }
  }, [product?.id, product?.price_usd])

  return discountInfo
}

export function useMultipleProductDiscounts(products: any[]) {
  const [discounts, setDiscounts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscribeToDiscountRules()
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const calculate = async () => {
      if (!products || products.length === 0) {
        if (isMounted) {
          setDiscounts({})
          setLoading(false)
        }
        return
      }

      if (isMounted) setLoading(true)

      try {
        const customer = await getCustomerContext()
        if (!customer) {
          const defaultDiscounts: Record<string, any> = {}
          products.forEach((p) => {
            defaultDiscounts[p.id] = {
              originalPrice: p.price_usd || 0,
              discountedPrice: null,
              discountPercentage: null,
              discountAmount: null,
              appliedRule: null,
            }
          })
          if (isMounted) {
            setDiscounts(defaultDiscounts)
            setLoading(false)
          }
          return
        }

        const newDiscounts: Record<string, any> = {}
        for (const p of products) {
          newDiscounts[p.id] = await discountService.calculateBestDiscount(
            p,
            customer.role,
            customer.id,
          )
        }

        if (isMounted) {
          setDiscounts(newDiscounts)
          setLoading(false)
        }
      } catch (err) {
        const defaultDiscounts: Record<string, any> = {}
        products.forEach((p) => {
          defaultDiscounts[p.id] = {
            originalPrice: p.price_usd || 0,
            discountedPrice: null,
            discountPercentage: null,
            discountAmount: null,
            appliedRule: null,
          }
        })
        if (isMounted) {
          setDiscounts(defaultDiscounts)
          setLoading(false)
        }
      }
    }

    calculate()

    const listener = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        calculate()
      }, 300)
    }

    listeners.add(listener)

    return () => {
      isMounted = false
      listeners.delete(listener)
      clearTimeout(timeoutId)
    }
  }, [JSON.stringify(products.map((p) => p.id)), JSON.stringify(products.map((p) => p.price_usd))])

  return { discounts, loading }
}
