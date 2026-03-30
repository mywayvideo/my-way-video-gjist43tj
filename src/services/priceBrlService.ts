export interface PriceSettings {
  exchange_rate: number
  exchange_spread: number
  freight_per_kg_usd: number
  weight_margin: number
  markup: number
}

export function calculatePriceBRL(
  priceUsd: number | null | undefined,
  weight: number | null | undefined,
  discountPercentage: number | null | undefined,
  settings: PriceSettings | null,
): number | null {
  if (!priceUsd || priceUsd <= 0 || !weight || weight <= 0 || !settings) {
    return null
  }

  const { exchange_rate, exchange_spread, freight_per_kg_usd, weight_margin, markup } = settings

  let priceUsdAfterDiscount = priceUsd
  if (discountPercentage && discountPercentage > 0) {
    priceUsdAfterDiscount = priceUsd * (1 - discountPercentage / 100)
  }

  const weightInKg = (weight + weight_margin) / 2.204
  const freightUsd = weightInKg * freight_per_kg_usd
  const priceBeforeMarkup = priceUsdAfterDiscount + freightUsd
  const priceUsdFinal = priceBeforeMarkup / markup
  const effectiveExchangeRate = exchange_rate + exchange_spread
  const priceBrlFinal = priceUsdFinal * effectiveExchangeRate

  return Math.round(priceBrlFinal * 100) / 100
}
