import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useLegalSettings() {
  const [settings, setSettings] = useState({
    address: 'Not provided',
    phone: 'Not provided',
    email: 'Not provided',
    adminEmail: 'admin@mywayvideo.com',
  })

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'company_address',
          'company_whatsapp',
          'company_email',
          'company_admin_email',
        ])

      if (data) {
        const s = { ...settings }
        data.forEach((item) => {
          if (item.setting_key === 'company_address' && item.setting_value)
            s.address = item.setting_value
          if (item.setting_key === 'company_whatsapp' && item.setting_value)
            s.phone = item.setting_value
          if (item.setting_key === 'company_email' && item.setting_value)
            s.email = item.setting_value
          if (item.setting_key === 'company_admin_email' && item.setting_value)
            s.adminEmail = item.setting_value
        })
        setSettings(s)
      }
    }
    fetchSettings()
  }, [])

  return settings
}
