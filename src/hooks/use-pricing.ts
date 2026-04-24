import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface PricingConfig {
  exchange_rate: number
  spread_percentage: number
  weight_factor: number
  fixed_import_fee: number
}

interface PriceDisplay {
  label: string
  value: number
  currency: string
}

export function usePricing(product: any) {
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data, error } = await supabase
          .from('shipping_configs')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (data && !error) {
          setConfig(data)
        } else {
          setConfig({
            exchange_rate: 5.0,
            spread_percentage: 10,
            weight_factor: 50,
            fixed_import_fee: 100,
          })
        }
      } catch (err) {
        console.error('Error fetching shipping_configs:', err)
        setConfig({
          exchange_rate: 5.0,
          spread_percentage: 10,
          weight_factor: 50,
          fixed_import_fee: 100,
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  if (!product) {
    return { primaryPrice: null, secondaryPrice: null, baseUsaPrice: 0, isLoading }
  }

  const priceUsa = Number(product.price_usd) || Number(product.price_usa) || 0
  const priceUsaRebate = Number(product.price_usa_rebate) || 0
  const dateRebate = product.date_rebate
  const priceNationalizedSales = Number(product.price_nationalized_sales) || 0
  const priceNationalizedCurrency = product.price_nationalized_currency || 'BRL'
  const weight = Number(product.weight) || 0

  let baseUsaPrice = priceUsa

  if (priceUsaRebate > 0) {
    if (!dateRebate) {
      baseUsaPrice = priceUsaRebate
    } else {
      const currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)
      const rebateDate = new Date(dateRebate)
      rebateDate.setHours(0, 0, 0, 0)

      if (currentDate <= rebateDate) {
        baseUsaPrice = priceUsaRebate
      } else {
        baseUsaPrice = priceUsa
      }
    }
  }

  const exchangeRate = Number(config?.exchange_rate) || 5.0
  const spread = Number(config?.spread_percentage) || 0
  const weightFactor = Number(config?.weight_factor) || 0
  const fixedImportFee = Number(config?.fixed_import_fee) || 0

  const calculateBRL = (baseUsd: number, w: number = 0) => {
    const rateWithSpread = exchangeRate * (1 + spread / 100)
    return baseUsd * rateWithSpread + w * weightFactor + fixedImportFee
  }

  let primaryPrice: PriceDisplay | null = null
  let secondaryPrice: PriceDisplay | null = null

  const hasNationalized = priceNationalizedSales > 0

  if (hasNationalized) {
    let nationalizedVal = 0
    if (priceNationalizedCurrency === 'USD') {
      nationalizedVal = calculateBRL(priceNationalizedSales, 0)
    } else {
      nationalizedVal = priceNationalizedSales
    }

    primaryPrice = {
      label: 'Brasil',
      value: nationalizedVal,
      currency: 'BRL',
    }

    if (baseUsaPrice > 0) {
      secondaryPrice = {
        label: 'USA',
        value: baseUsaPrice,
        currency: 'USD',
      }
    }
  } else if (baseUsaPrice > 0) {
    primaryPrice = {
      label: 'USA',
      value: baseUsaPrice,
      currency: 'USD',
    }
    if (weight > 0) {
      secondaryPrice = {
        label: 'Brasil',
        value: calculateBRL(baseUsaPrice, weight),
        currency: 'BRL',
      }
    }
  }

  return { primaryPrice, secondaryPrice, baseUsaPrice, isLoading }
}
