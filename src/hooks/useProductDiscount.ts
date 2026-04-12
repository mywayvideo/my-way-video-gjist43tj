import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  calculateDiscountedPrice,
  calculateDiscountPercentage,
} from '@/services/discountApplicationService'

export function useMultipleProductDiscounts(products: any[]) {
  const [discountsMap, setDiscountsMap] = useState<
    Record<
      string,
      {
        originalPrice: number | null
        discountedPrice: number | null
        discountPercentage: number
        ruleName: string | null
      }
    >
  >({})

  const productsHash = products
    .map((p) => `${p?.id}-${p?.price_usd}-${p?.price_cost}-${p?.manufacturer_id}-${p?.category_id}`)
    .join('|')

  useEffect(() => {
    if (!products || products.length === 0) {
      setDiscountsMap({})
      return
    }

    const fetchDiscounts = async () => {
      try {
        const { data: discounts, error } = await supabase
          .from('discounts')
          .select('*')
          .eq('is_active', true)

        const newMap: Record<string, any> = {}

        if (error || !discounts || discounts.length === 0) {
          products.forEach((p) => {
            if (!p?.id) return
            newMap[p.id] = {
              originalPrice: p.price_usd || null,
              discountedPrice: p.price_usd || null,
              discountPercentage: 0,
              ruleName: null,
            }
          })
          setDiscountsMap(newMap)
          return
        }

        const now = new Date()

        products.forEach((product) => {
          if (!product?.id) return

          const priceUsd = product.price_usd
          const costPrice = product.price_cost || 0

          if (typeof priceUsd !== 'number') {
            newMap[product.id] = {
              originalPrice: null,
              discountedPrice: null,
              discountPercentage: 0,
              ruleName: null,
            }
            return
          }

          const validDiscounts = discounts.filter((rule) => {
            if (!rule.discount_value || rule.discount_value <= 0) return false

            // Date match
            if (rule.start_date && new Date(rule.start_date) > now) return false
            if (rule.end_date) {
              const endDate = new Date(rule.end_date)
              endDate.setHours(23, 59, 59, 999)
              if (now > endDate) return false
            }

            // Exclusion check
            if (rule.excluded_products && Array.isArray(rule.excluded_products)) {
              if (rule.excluded_products.includes(product.id)) return false
            }

            const targetType = rule.target_type || 'specific'

            if (targetType === 'all') return true

            if (targetType === 'specific') {
              return (
                Array.isArray(rule.product_selection) && rule.product_selection.includes(product.id)
              )
            }

            if (targetType === 'manufacturer') {
              return (
                Array.isArray(rule.manufacturer_ids) &&
                rule.manufacturer_ids.includes(product.manufacturer_id)
              )
            }

            if (targetType === 'category') {
              return (
                Array.isArray(rule.category_ids) && rule.category_ids.includes(product.category_id)
              )
            }

            if (targetType === 'manufacturer_category') {
              const hasManufacturer =
                Array.isArray(rule.manufacturer_ids) &&
                rule.manufacturer_ids.includes(product.manufacturer_id)
              const hasCategory =
                Array.isArray(rule.category_ids) && rule.category_ids.includes(product.category_id)
              return hasManufacturer && hasCategory
            }

            // Fallback for old rules
            if (Array.isArray(rule.product_selection)) {
              return rule.product_selection.includes(product.id)
            }

            return false
          })

          if (validDiscounts.length === 0) {
            newMap[product.id] = {
              originalPrice: priceUsd,
              discountedPrice: priceUsd,
              discountPercentage: 0,
              ruleName: null,
            }
            return
          }

          let bestRule = null
          let lowestPrice = priceUsd

          for (const rule of validDiscounts) {
            const dPrice = calculateDiscountedPrice(
              priceUsd,
              costPrice,
              rule.discount_type,
              rule.discount_value,
            )
            if (dPrice < lowestPrice) {
              lowestPrice = dPrice
              bestRule = rule
            }
          }

          if (bestRule && lowestPrice < priceUsd) {
            newMap[product.id] = {
              originalPrice: priceUsd,
              discountedPrice: lowestPrice,
              discountPercentage: calculateDiscountPercentage(priceUsd, lowestPrice),
              ruleName: bestRule.name,
            }
          } else {
            newMap[product.id] = {
              originalPrice: priceUsd,
              discountedPrice: priceUsd,
              discountPercentage: 0,
              ruleName: null,
            }
          }
        })

        setDiscountsMap(newMap)
      } catch (err) {
        console.error('Error fetching discounts:', err)
        const newMap: Record<string, any> = {}
        products.forEach((p) => {
          if (!p?.id) return
          newMap[p.id] = {
            originalPrice: p.price_usd || null,
            discountedPrice: p.price_usd || null,
            discountPercentage: 0,
            ruleName: null,
          }
        })
        setDiscountsMap(newMap)
      }
    }

    fetchDiscounts()
  }, [productsHash])

  return discountsMap
}

export function useProductDiscount(product: any) {
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null)
  const [discountPercentage, setDiscountPercentage] = useState<number>(0)
  const [ruleName, setRuleName] = useState<string | null>(null)
  const [originalPrice, setOriginalPrice] = useState<number | null>(null)

  useEffect(() => {
    if (!product || typeof product.price_usd !== 'number') {
      setOriginalPrice(null)
      setDiscountedPrice(null)
      setDiscountPercentage(0)
      setRuleName(null)
      return
    }

    const priceUsd = product.price_usd
    const costPrice = product.price_cost || 0
    setOriginalPrice(priceUsd)

    const fetchDiscounts = async () => {
      try {
        const { data: discounts, error } = await supabase
          .from('discounts')
          .select('*')
          .eq('is_active', true)

        if (error || !discounts || discounts.length === 0) {
          setDiscountedPrice(priceUsd)
          setDiscountPercentage(0)
          setRuleName(null)
          return
        }

        const now = new Date()

        const validDiscounts = discounts.filter((rule) => {
          if (!rule.discount_value || rule.discount_value <= 0) return false

          // Date match
          if (rule.start_date && new Date(rule.start_date) > now) return false
          if (rule.end_date) {
            const endDate = new Date(rule.end_date)
            endDate.setHours(23, 59, 59, 999)
            if (now > endDate) return false
          }

          // Exclusion check
          if (rule.excluded_products && Array.isArray(rule.excluded_products)) {
            if (rule.excluded_products.includes(product.id)) return false
          }

          const targetType = rule.target_type || 'specific'

          if (targetType === 'all') return true

          if (targetType === 'specific') {
            return (
              Array.isArray(rule.product_selection) && rule.product_selection.includes(product.id)
            )
          }

          if (targetType === 'manufacturer') {
            return (
              Array.isArray(rule.manufacturer_ids) &&
              rule.manufacturer_ids.includes(product.manufacturer_id)
            )
          }

          if (targetType === 'category') {
            return (
              Array.isArray(rule.category_ids) && rule.category_ids.includes(product.category_id)
            )
          }

          if (targetType === 'manufacturer_category') {
            const hasManufacturer =
              Array.isArray(rule.manufacturer_ids) &&
              rule.manufacturer_ids.includes(product.manufacturer_id)
            const hasCategory =
              Array.isArray(rule.category_ids) && rule.category_ids.includes(product.category_id)
            return hasManufacturer && hasCategory
          }

          // Fallback for old rules
          if (Array.isArray(rule.product_selection)) {
            return rule.product_selection.includes(product.id)
          }

          return false
        })

        if (validDiscounts.length === 0) {
          setDiscountedPrice(priceUsd)
          setDiscountPercentage(0)
          setRuleName(null)
          return
        }

        // Find the one with highest discount_value or highest calculated discount
        let bestRule = null
        let lowestPrice = priceUsd

        for (const rule of validDiscounts) {
          const dPrice = calculateDiscountedPrice(
            priceUsd,
            costPrice,
            rule.discount_type,
            rule.discount_value,
          )
          if (dPrice < lowestPrice) {
            lowestPrice = dPrice
            bestRule = rule
          }
        }

        if (bestRule && lowestPrice < priceUsd) {
          setDiscountedPrice(lowestPrice)
          setDiscountPercentage(calculateDiscountPercentage(priceUsd, lowestPrice))
          setRuleName(bestRule.name)
        } else {
          setDiscountedPrice(priceUsd)
          setDiscountPercentage(0)
          setRuleName(null)
        }
      } catch (err) {
        console.error('Error fetching discounts:', err)
        setDiscountedPrice(priceUsd)
        setDiscountPercentage(0)
        setRuleName(null)
      }
    }

    fetchDiscounts()
  }, [
    product?.id,
    product?.price_usd,
    product?.price_cost,
    product?.manufacturer_id,
    product?.category_id,
  ])

  return { originalPrice, discountedPrice, discountPercentage, ruleName }
}
