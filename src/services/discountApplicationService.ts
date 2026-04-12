import { Discount } from '@/types/discount'

export interface DiscountCalculation {
  originalPrice: number
  discountedPrice: number
  discountPercentage: number
  ruleName: string | null
  discountType: string | null
}

export const calculateDiscountedPrice = (
  originalPrice: number,
  costPrice: number,
  discountType: string,
  discountValue: number,
): number => {
  if (discountValue <= 0) return originalPrice

  if (discountType === 'margin_percentage') {
    const margin = originalPrice - costPrice
    if (margin <= 0) return originalPrice // No margin to discount
    const newMargin = margin * (1 - discountValue / 100)
    return costPrice + newMargin
  }

  if (discountType === 'price_usa_percentage') {
    return originalPrice * (1 - discountValue / 100)
  }

  return originalPrice
}

export const calculateDiscountPercentage = (
  originalPrice: number,
  discountedPrice: number,
): number => {
  if (originalPrice <= 0) return 0
  return ((originalPrice - discountedPrice) / originalPrice) * 100
}

export const getApplicableDiscounts = (
  discounts: Discount[],
  productId: string,
  userId?: string | null,
  userRole?: string | null,
  productManufacturerId?: string | null,
  productCategoryId?: string | null,
): Discount[] => {
  const now = new Date()

  return discounts.filter((rule: any) => {
    if (!rule.is_active) return false
    if (!rule.discount_value || rule.discount_value <= 0) return false

    // Date match
    if (rule.start_date) {
      const startDate = new Date(rule.start_date)
      if (now < startDate) return false
    }
    if (rule.end_date) {
      const endDate = new Date(rule.end_date)
      endDate.setHours(23, 59, 59, 999) // End of day
      if (now > endDate) return false
    }

    // Exclusion match
    if (rule.excluded_products && Array.isArray(rule.excluded_products)) {
      if (rule.excluded_products.includes(productId)) return false
    }

    // Target match
    const targetType = rule.target_type || 'specific'
    let matchesProduct = false

    if (targetType === 'all') {
      matchesProduct = true
    } else if (targetType === 'specific') {
      matchesProduct =
        Array.isArray(rule.product_selection) && rule.product_selection.includes(productId)
    } else if (targetType === 'manufacturer') {
      matchesProduct =
        Array.isArray(rule.manufacturer_ids) && productManufacturerId
          ? rule.manufacturer_ids.includes(productManufacturerId)
          : false
    } else if (targetType === 'category') {
      matchesProduct =
        Array.isArray(rule.category_ids) && productCategoryId
          ? rule.category_ids.includes(productCategoryId)
          : false
    } else if (targetType === 'manufacturer_category') {
      const hasManufacturer =
        Array.isArray(rule.manufacturer_ids) && productManufacturerId
          ? rule.manufacturer_ids.includes(productManufacturerId)
          : false
      const hasCategory =
        Array.isArray(rule.category_ids) && productCategoryId
          ? rule.category_ids.includes(productCategoryId)
          : false
      matchesProduct = hasManufacturer && hasCategory
    } else {
      // Fallback
      matchesProduct =
        Array.isArray(rule.product_selection) && rule.product_selection.includes(productId)
    }

    if (!matchesProduct) return false

    return true
  })
}

export const getBestDiscount = (
  discounts: Discount[],
  productId: string,
  userId: string | null,
  userRole: string | null,
  originalPrice: number,
  costPrice: number,
  productManufacturerId?: string | null,
  productCategoryId?: string | null,
): DiscountCalculation => {
  const defaultCalc: DiscountCalculation = {
    originalPrice,
    discountedPrice: originalPrice,
    discountPercentage: 0,
    ruleName: null,
    discountType: null,
  }

  if (!originalPrice || originalPrice <= 0) return defaultCalc

  const applicable = getApplicableDiscounts(
    discounts,
    productId,
    userId,
    userRole,
    productManufacturerId,
    productCategoryId,
  )
  if (applicable.length === 0) return defaultCalc

  let bestRule: Discount | null = null
  let lowestPrice = originalPrice

  for (const rule of applicable) {
    const discountedPrice = calculateDiscountedPrice(
      originalPrice,
      costPrice,
      rule.discount_type,
      rule.discount_value,
    )

    if (discountedPrice < lowestPrice) {
      lowestPrice = discountedPrice
      bestRule = rule
    } else if (discountedPrice === lowestPrice && bestRule) {
      // Tie-breaker: first created wins
      const currentCreated = new Date(rule.created_at || 0).getTime()
      const bestCreated = new Date(bestRule.created_at || 0).getTime()
      if (currentCreated < bestCreated) {
        bestRule = rule
      }
    }
  }

  if (bestRule && lowestPrice < originalPrice) {
    return {
      originalPrice,
      discountedPrice: lowestPrice,
      discountPercentage: calculateDiscountPercentage(originalPrice, lowestPrice),
      ruleName: bestRule.name,
      discountType: bestRule.discount_type,
    }
  }

  return defaultCalc
}
