import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { calculatePriceBRL, PriceSettings } from '@/services/priceBrlService'

let cachedSettings: PriceSettings | null = null
let fetchPromise: Promise<PriceSettings | null> | null = null

export function useCalculatePriceBRL(
  priceUsd: number | null | undefined,
  weight: number | null | undefined,
  discountPercentage: number | null | undefined,
) {
  const [settings, setSettings] = useState<PriceSettings | null>(cachedSettings)
  const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings)
      setLoading(false)
      return
    }

    if (!fetchPromise) {
      fetchPromise = supabase
        .from('price_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            cachedSettings = {
              exchange_rate: Number(data.exchange_rate),
              exchange_spread: Number(data.exchange_spread),
              freight_per_kg_usd: Number(data.freight_per_kg_usd),
              weight_margin: Number(data.weight_margin),
              markup: Number(data.markup),
            }
            return cachedSettings
          }
          return null
        })
        .catch((err) => {
          console.error(err)
          return null
        })
    }

    fetchPromise.then((res) => {
      setSettings(res)
      setLoading(false)
    })
  }, [])

  const calculatedPrice = calculatePriceBRL(priceUsd, weight, discountPercentage, settings)

  return { calculatedPrice, loading }
}
