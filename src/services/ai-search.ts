import { supabase } from '@/lib/supabase/client'

export type AISearchResponse = {
  message: string
  referenced_internal_products: string[]
  should_show_whatsapp_button: boolean
  whatsapp_reason?: string
  price_context: string
  used_web_search: boolean
  confidence_level: 'high' | 'medium' | 'low'
  type?: 'institutional' | 'products' | 'technical' | 'not_found'
}

export const performAISearch = async (
  query: string,
  signal?: AbortSignal,
): Promise<{ data: AISearchResponse | null; error: any }> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
      signal,
    })

    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`)
    }

    const data = await res.json()
    return { data, error: null }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { data: null, error: new Error('Aborted') }
    }
    return { data: null, error }
  }
}
