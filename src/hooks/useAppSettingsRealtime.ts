import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { z } from 'zod'

const appSettingsSchema = z.object({
  setting_key: z.string(),
  setting_value_numeric: z.number().nullable(),
})

interface AppSettingsRealtime {
  pricePerKg: number
  percentageValue: number
  additionalWeightKg: number
  isLoading: boolean
  error: string | null
}

export function useAppSettingsRealtime(): AppSettingsRealtime {
  const [settings, setSettings] = useState({
    pricePerKg: 120,
    percentageValue: 10,
    additionalWeightKg: 0.5,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const keys = [
      'shipping_sao_paulo_price_per_kg',
      'shipping_sao_paulo_percentage_value',
      'shipping_sao_paulo_additional_weight_kg',
    ]

    const fetchInitialValues = async () => {
      setIsLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value_numeric')
          .in('setting_key', keys)

        if (fetchError) throw fetchError

        if (data && isMounted) {
          const parsedData = z.array(appSettingsSchema).safeParse(data)
          if (parsedData.success) {
            setSettings((prev) => {
              const next = { ...prev }
              parsedData.data.forEach((item) => {
                if (item.setting_value_numeric !== null) {
                  if (item.setting_key === 'shipping_sao_paulo_price_per_kg') {
                    next.pricePerKg = item.setting_value_numeric
                  } else if (item.setting_key === 'shipping_sao_paulo_percentage_value') {
                    next.percentageValue = item.setting_value_numeric
                  } else if (item.setting_key === 'shipping_sao_paulo_additional_weight_kg') {
                    next.additionalWeightKg = item.setting_value_numeric
                  }
                }
              })
              return next
            })
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Nao foi possivel carregar configuracoes de frete.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchInitialValues()

    const channel = supabase
      .channel('app_settings_sao_paulo_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
        },
        (payload) => {
          if (!isMounted) return

          const parsedPayload = appSettingsSchema.safeParse(payload.new)
          if (parsedPayload.success && parsedPayload.data.setting_value_numeric !== null) {
            const { setting_key, setting_value_numeric } = parsedPayload.data

            if (keys.includes(setting_key)) {
              setSettings((prev) => {
                const next = { ...prev }
                if (setting_key === 'shipping_sao_paulo_price_per_kg') {
                  next.pricePerKg = setting_value_numeric
                } else if (setting_key === 'shipping_sao_paulo_percentage_value') {
                  next.percentageValue = setting_value_numeric
                } else if (setting_key === 'shipping_sao_paulo_additional_weight_kg') {
                  next.additionalWeightKg = setting_value_numeric
                }
                return next
              })
            }
          }
        },
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error for app_settings:', err)
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    ...settings,
    isLoading,
    error,
  }
}
