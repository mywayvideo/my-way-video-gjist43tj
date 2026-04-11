import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

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
let activeDiscountsCache: any[] | null = null
let fetchingDiscountsPromise: Promise<any[]> | null = null

export function clearDiscountCache() {
  activeDiscountsCache = null
}

async function fetchActiveDiscounts() {
  if (activeDiscountsCache) return activeDiscountsCache
  if (fetchingDiscountsPromise) return fetchingDiscountsPromise

  fetchingDiscountsPromise = (async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)

      if (error) throw error
      activeDiscountsCache = data || []
      return activeDiscountsCache
    } catch (err) {
      console.error('Error fetching discounts:', err)
      return []
    } finally {
      fetchingDiscountsPromise = null
    }
  })()

  return fetchingDiscountsPromise
}

function subscribeToDiscounts() {
  if (isRealtimeSubscribed) return
  isRealtimeSubscribed = true

  supabase
    .channel('discounts_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'discounts' }, () => {
      clearDiscountCache()
      listeners.forEach((listener) => listener())
    })
    .subscribe()

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      globalCustomerCache = null
      clearDiscountCache()
      setTimeout(() => {
        listeners.forEach((listener) => listener())
      }, 300)
    }
  })
}

function calculateBestDiscountSync(
  product: any,
  discounts: any[],
  customerId: string | null,
  customerRole: string | null,
) {
  if (!product || product.price_usd == null) return null

  let bestDiscountAmount = 0
  let bestDiscountedPrice = product.price_usd
  let bestDiscountPercentage = 0
  let appliedRule = null

  for (const discount of discounts) {
    if (discount.customer_application_type === 'rule' && discount.customer_role) {
      if (!customerRole || discount.customer_role !== customerRole) continue
    }
    if (discount.customer_application_type === 'specific_customers' && discount.customers) {
      if (!customerId || !discount.customers.includes(customerId)) continue
    }

    let matches = false
    const targetType = discount.target_type || 'specific'
    const excluded = discount.excluded_products || []

    if (excluded.includes(product.id)) continue

    const mIds =
      discount.manufacturer_ids || (discount.manufacturer_id ? [discount.manufacturer_id] : [])
    const cIds = discount.category_ids || (discount.category_id ? [discount.category_id] : [])

    if (targetType === 'all') {
      matches = true
    } else if (targetType === 'specific') {
      if (discount.product_selection && Array.isArray(discount.product_selection)) {
        if (discount.product_selection.includes(product.id)) matches = true
      }
    } else if (targetType === 'manufacturer') {
      if (mIds.includes(product.manufacturer_id)) matches = true
    } else if (targetType === 'category') {
      if (cIds.includes(product.category_id)) matches = true
    } else if (targetType === 'manufacturer_category') {
      if (mIds.includes(product.manufacturer_id) && cIds.includes(product.category_id))
        matches = true
    } else {
      if (
        discount.product_selection &&
        Array.isArray(discount.product_selection) &&
        discount.product_selection.includes(product.id)
      ) {
        matches = true
      } else if (!discount.product_selection || discount.product_selection.length === 0) {
        if (discount.category_id && product.category_id === discount.category_id) matches = true
        else if (discount.manufacturer_id && product.manufacturer_id === discount.manufacturer_id)
          matches = true
        else if (!discount.category_id && !discount.manufacturer_id) matches = true
      }
    }

    if (!matches) continue

    let discountAmount = 0
    let discountedPrice = product.price_usd
    const value = Number(discount.discount_value) || 0

    if (discount.discount_type === 'margin_percentage') {
      if (product.price_cost != null && product.price_cost < product.price_usd) {
        discountAmount = (product.price_usd - product.price_cost) * (value / 100)
        discountedPrice = product.price_usd - discountAmount
      } else {
        continue
      }
    } else if (
      discount.discount_type === 'price_usa_percentage' ||
      discount.discount_type === 'percentage'
    ) {
      discountAmount = product.price_usd * (value / 100)
      discountedPrice = product.price_usd - discountAmount
    } else if (discount.discount_type === 'fixed' || discount.discount_type === 'fixed_amount') {
      discountAmount = value
      discountedPrice = product.price_usd - discountAmount
    } else {
      discountAmount = product.price_usd * (value / 100)
      discountedPrice = product.price_usd - discountAmount
    }

    if (discountedPrice < 0) {
      discountedPrice = 0
      discountAmount = product.price_usd
    }

    if (discountAmount > bestDiscountAmount) {
      bestDiscountAmount = discountAmount
      bestDiscountedPrice = discountedPrice
      bestDiscountPercentage = (discountAmount / product.price_usd) * 100
      appliedRule = discount
    }
  }

  if (appliedRule) {
    return {
      originalPrice: product.price_usd,
      discountedPrice: bestDiscountedPrice,
      discountPercentage: bestDiscountPercentage,
      discountAmount: bestDiscountAmount,
      appliedRule,
    }
  }

  return {
    originalPrice: product.price_usd,
    discountedPrice: null,
    discountPercentage: null,
    discountAmount: null,
    appliedRule: null,
  }
}

export function useProductDiscount(product: any) {
  const [discountInfo, setDiscountInfo] = useState({
    originalPrice: product?.price_usd || 0,
    discountedPrice: null as number | null,
    discountPercentage: null as number | null,
    discountAmount: null as number | null,
    appliedRule: null as any | null,
    loading: true,
  })

  useEffect(() => {
    subscribeToDiscounts()
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
        const activeDiscounts = await fetchActiveDiscounts()
        const info = calculateBestDiscountSync(
          product,
          activeDiscounts,
          customer?.id || null,
          customer?.role || null,
        )

        if (isMounted) {
          setDiscountInfo({ ...(info as any), loading: false })
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
      }, 50)
    }

    listeners.add(listener)

    return () => {
      isMounted = false
      listeners.delete(listener)
      clearTimeout(timeoutId)
    }
  }, [
    product?.id,
    product?.price_usd,
    product?.category_id,
    product?.manufacturer_id,
    product?.price_cost,
  ])

  return discountInfo
}

export function useMultipleProductDiscounts(products: any[]) {
  const [discounts, setDiscounts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscribeToDiscounts()
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
        const activeDiscounts = await fetchActiveDiscounts()

        const newDiscounts: Record<string, any> = {}
        for (const p of products) {
          newDiscounts[p.id] = calculateBestDiscountSync(
            p,
            activeDiscounts,
            customer?.id || null,
            customer?.role || null,
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
      }, 50)
    }

    listeners.add(listener)

    return () => {
      isMounted = false
      listeners.delete(listener)
      clearTimeout(timeoutId)
    }
  }, [
    JSON.stringify(products.map((p) => p.id)),
    JSON.stringify(products.map((p) => p.price_usd)),
    JSON.stringify(products.map((p) => p.price_cost)),
  ])

  return { discounts, loading }
}
