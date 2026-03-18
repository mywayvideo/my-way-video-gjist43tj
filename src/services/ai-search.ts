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
): Promise<{ data: AISearchResponse | null; error: any }> => {
  const { data, error } = await supabase.functions.invoke<AISearchResponse>('ai-search', {
    body: { query },
  })
  return { data, error }
}
