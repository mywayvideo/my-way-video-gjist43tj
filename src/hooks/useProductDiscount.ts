import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  calculateDiscountedPrice,
  calculateDiscountPercentage,
} from '@/services/discountApplicationService'

export function useMultipleProductDiscounts(products: any[]) {
  const [discountsMap, setDiscountsMap] = useState<Record<string, any>>({})

  const productsHash = products
    .map((p) => `${p?.id}-${p?.price_usd}-${p?.price_nationalized_sales}`)
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

            const pUsd = typeof p.price_usd === 'number' && p.price_usd > 0 ? p.price_usd : null
            const pNat =
              typeof p.price_nationalized_sales === 'number' && p.price_nationalized_sales > 0
                ? p.price_nationalized_sales
                : null
            const fallbackOrig = pUsd !== null ? pUsd : pNat
            const curr = pUsd !== null ? 'USD' : 'BRL'

            newMap[p.id] = {
              originalPrice: fallbackOrig,
              discountedPrice: fallbackOrig,
              originalPriceNat: pNat,
              discountedPriceNat: pNat,
              discountPercentage: 0,
              ruleName: null,
              currency: curr,
            }
          })
          setDiscountsMap(newMap)
          return
        }

        const now = new Date()

        products.forEach((product) => {
          if (!product?.id) return

          const priceUsd =
            typeof product.price_usd === 'number' && product.price_usd > 0
              ? product.price_usd
              : null
          const costUsd = product.price_cost || 0

          const priceNat =
            typeof product.price_nationalized_sales === 'number' &&
            product.price_nationalized_sales > 0
              ? product.price_nationalized_sales
              : null
          const costNat = product.price_nationalized_cost || 0

          const fallbackOriginal = priceUsd !== null ? priceUsd : priceNat
          const fallbackCurrency = priceUsd !== null ? 'USD' : 'BRL'

          if (priceUsd === null && priceNat === null) {
            newMap[product.id] = {
              originalPrice: null,
              discountedPrice: null,
              originalPriceNat: null,
              discountedPriceNat: null,
              discountPercentage: 0,
              ruleName: null,
              currency: 'USD',
            }
            return
          }

          const validDiscounts = discounts.filter((rule) => {
            if (!rule.discount_value || rule.discount_value <= 0) return false
            if (rule.start_date && new Date(rule.start_date) > now) return false
            if (rule.end_date) {
              const endDate = new Date(rule.end_date)
              endDate.setHours(23, 59, 59, 999)
              if (now > endDate) return false
            }
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
            if (Array.isArray(rule.product_selection)) {
              return rule.product_selection.includes(product.id)
            }
            return false
          })

          if (validDiscounts.length === 0) {
            newMap[product.id] = {
              originalPrice: fallbackOriginal,
              discountedPrice: fallbackOriginal,
              originalPriceNat: priceNat,
              discountedPriceNat: priceNat,
              discountPercentage: 0,
              ruleName: null,
              currency: fallbackCurrency,
            }
            return
          }

          let bestRuleUsd = null
          let lowestPriceUsd = priceUsd !== null ? priceUsd : Infinity

          let bestRuleNat = null
          let lowestPriceNat = priceNat !== null ? priceNat : Infinity

          for (const rule of validDiscounts) {
            if (priceUsd !== null) {
              const dPrice = calculateDiscountedPrice(
                priceUsd,
                costUsd,
                rule.discount_type,
                rule.discount_value,
              )
              if (dPrice < lowestPriceUsd) {
                lowestPriceUsd = dPrice
                bestRuleUsd = rule
              }
            }
            if (priceNat !== null) {
              const dPrice = calculateDiscountedPrice(
                priceNat,
                costNat,
                rule.discount_type,
                rule.discount_value,
              )
              if (dPrice < lowestPriceNat) {
                lowestPriceNat = dPrice
                bestRuleNat = rule
              }
            }
          }

          const hasUsdDiscount = bestRuleUsd && lowestPriceUsd < (priceUsd as number)
          const hasNatDiscount = bestRuleNat && lowestPriceNat < (priceNat as number)

          const finalBestRule =
            priceUsd !== null
              ? hasUsdDiscount
                ? bestRuleUsd
                : null
              : hasNatDiscount
                ? bestRuleNat
                : null
          const finalDiscountPercentage =
            priceUsd !== null
              ? hasUsdDiscount
                ? calculateDiscountPercentage(priceUsd as number, lowestPriceUsd)
                : 0
              : hasNatDiscount
                ? calculateDiscountPercentage(priceNat as number, lowestPriceNat)
                : 0

          newMap[product.id] = {
            originalPrice: fallbackOriginal,
            discountedPrice:
              priceUsd !== null
                ? hasUsdDiscount
                  ? lowestPriceUsd
                  : priceUsd
                : hasNatDiscount
                  ? lowestPriceNat
                  : priceNat,
            originalPriceNat: priceNat,
            discountedPriceNat: hasNatDiscount ? lowestPriceNat : priceNat,
            discountPercentage: finalDiscountPercentage,
            ruleName: finalBestRule ? finalBestRule.name : null,
            currency: fallbackCurrency,
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
            originalPriceNat: p.price_nationalized_sales || null,
            discountedPriceNat: p.price_nationalized_sales || null,
            discountPercentage: 0,
            ruleName: null,
            currency: 'USD',
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
  const [originalPrice, setOriginalPrice] = useState<number | null>(null)

  const [discountedPriceNat, setDiscountedPriceNat] = useState<number | null>(null)
  const [originalPriceNat, setOriginalPriceNat] = useState<number | null>(null)

  const [discountPercentage, setDiscountPercentage] = useState<number>(0)
  const [ruleName, setRuleName] = useState<string | null>(null)
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD')

  useEffect(() => {
    if (!product) {
      setOriginalPrice(null)
      setDiscountedPrice(null)
      setOriginalPriceNat(null)
      setDiscountedPriceNat(null)
      setDiscountPercentage(0)
      setRuleName(null)
      setCurrency('USD')
      return
    }

    const priceUsd =
      typeof product.price_usd === 'number' && product.price_usd > 0 ? product.price_usd : null
    const costUsd = product.price_cost || 0

    const priceNat =
      typeof product.price_nationalized_sales === 'number' && product.price_nationalized_sales > 0
        ? product.price_nationalized_sales
        : null
    const costNat = product.price_nationalized_cost || 0

    const fallbackOriginal = priceUsd !== null ? priceUsd : priceNat
    const fallbackCurrency = priceUsd !== null ? 'USD' : 'BRL'

    setOriginalPrice(fallbackOriginal)
    setOriginalPriceNat(priceNat)
    setCurrency(fallbackCurrency)

    if (priceUsd === null && priceNat === null) {
      setDiscountedPrice(null)
      setDiscountedPriceNat(null)
      setDiscountPercentage(0)
      setRuleName(null)
      return
    }

    const fetchDiscounts = async () => {
      try {
        const { data: discounts, error } = await supabase
          .from('discounts')
          .select('*')
          .eq('is_active', true)

        if (error || !discounts || discounts.length === 0) {
          setDiscountedPrice(fallbackOriginal)
          setDiscountedPriceNat(priceNat)
          setDiscountPercentage(0)
          setRuleName(null)
          return
        }

        const now = new Date()

        const validDiscounts = discounts.filter((rule) => {
          if (!rule.discount_value || rule.discount_value <= 0) return false
          if (rule.start_date && new Date(rule.start_date) > now) return false
          if (rule.end_date) {
            const endDate = new Date(rule.end_date)
            endDate.setHours(23, 59, 59, 999)
            if (now > endDate) return false
          }
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
          if (Array.isArray(rule.product_selection)) {
            return rule.product_selection.includes(product.id)
          }
          return false
        })

        if (validDiscounts.length === 0) {
          setDiscountedPrice(fallbackOriginal)
          setDiscountedPriceNat(priceNat)
          setDiscountPercentage(0)
          setRuleName(null)
          return
        }

        let bestRuleUsd = null
        let lowestPriceUsd = priceUsd !== null ? priceUsd : Infinity

        let bestRuleNat = null
        let lowestPriceNat = priceNat !== null ? priceNat : Infinity

        for (const rule of validDiscounts) {
          if (priceUsd !== null) {
            const dPrice = calculateDiscountedPrice(
              priceUsd,
              costUsd,
              rule.discount_type,
              rule.discount_value,
            )
            if (dPrice < lowestPriceUsd) {
              lowestPriceUsd = dPrice
              bestRuleUsd = rule
            }
          }
          if (priceNat !== null) {
            const dPrice = calculateDiscountedPrice(
              priceNat,
              costNat,
              rule.discount_type,
              rule.discount_value,
            )
            if (dPrice < lowestPriceNat) {
              lowestPriceNat = dPrice
              bestRuleNat = rule
            }
          }
        }

        const hasUsdDiscount = bestRuleUsd && lowestPriceUsd < (priceUsd as number)
        const hasNatDiscount = bestRuleNat && lowestPriceNat < (priceNat as number)

        const finalBestRule =
          priceUsd !== null
            ? hasUsdDiscount
              ? bestRuleUsd
              : null
            : hasNatDiscount
              ? bestRuleNat
              : null
        const finalDiscountPercentage =
          priceUsd !== null
            ? hasUsdDiscount
              ? calculateDiscountPercentage(priceUsd as number, lowestPriceUsd)
              : 0
            : hasNatDiscount
              ? calculateDiscountPercentage(priceNat as number, lowestPriceNat)
              : 0

        setDiscountedPrice(
          priceUsd !== null
            ? hasUsdDiscount
              ? lowestPriceUsd
              : priceUsd
            : hasNatDiscount
              ? lowestPriceNat
              : priceNat,
        )
        setOriginalPrice(fallbackOriginal)
        setDiscountedPriceNat(hasNatDiscount ? lowestPriceNat : priceNat)
        setOriginalPriceNat(priceNat)
        setDiscountPercentage(finalDiscountPercentage)
        setRuleName(finalBestRule ? finalBestRule.name : null)
      } catch (err) {
        console.error('Error fetching discounts:', err)
        setDiscountedPrice(fallbackOriginal)
        setDiscountedPriceNat(priceNat)
        setDiscountPercentage(0)
        setRuleName(null)
      }
    }

    fetchDiscounts()
  }, [
    product?.id,
    product?.price_usd,
    product?.price_cost,
    product?.price_nationalized_sales,
    product?.price_nationalized_cost,
    product?.manufacturer_id,
    product?.category_id,
  ])

  return {
    originalPrice,
    discountedPrice,
    originalPriceNat,
    discountedPriceNat,
    discountPercentage,
    ruleName,
    currency,
  }
}
