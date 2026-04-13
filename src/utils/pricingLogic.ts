export type Destination = 'brasil' | 'usa'

export interface ProductPricingInfo {
  price_nationalized_sales?: number | null
  price_nationalized_currency?: string | null
  price_usa?: number | null
  price_usd?: number | null
  weight?: number | null
}

export function getEligibilityAndPrice(
  product: ProductPricingInfo,
  destination: Destination,
  exchangeRate: number,
  shippingSettings: { pricePerKg: number; percentageValue: number; additionalWeightKg: number },
) {
  const usdPrice = product.price_usd ?? product.price_usa

  if (destination === 'brasil') {
    if (product.price_nationalized_sales && product.price_nationalized_sales > 0) {
      let finalPriceBrl = product.price_nationalized_sales
      if (product.price_nationalized_currency === 'USD') {
        finalPriceBrl *= exchangeRate
      }
      return { eligible: true, rule: 'A', price: finalPriceBrl, currency: 'BRL', reason: null }
    }

    if (usdPrice && usdPrice > 0 && product.weight && product.weight > 0) {
      const weight_kg = product.weight / 2.204
      const total_weight_kg = weight_kg + shippingSettings.additionalWeightKg
      const freight_usd = total_weight_kg * shippingSettings.pricePerKg
      const percentage_charge = (usdPrice * shippingSettings.percentageValue) / 100
      const total_usd = usdPrice + freight_usd + percentage_charge
      const finalPriceBrl = total_usd * exchangeRate
      return { eligible: true, rule: 'B', price: finalPriceBrl, currency: 'BRL', reason: null }
    }

    return {
      eligible: false,
      rule: null,
      price: 0,
      currency: 'BRL',
      reason: 'Requer preço nacionalizado ou peso para importação.',
    }
  } else {
    // USA
    if (usdPrice && usdPrice > 0) {
      return { eligible: true, rule: 'C', price: usdPrice, currency: 'USD', reason: null }
    }
    return {
      eligible: false,
      rule: null,
      price: 0,
      currency: 'USD',
      reason: 'Requer preço em dólar configurado.',
    }
  }
}
