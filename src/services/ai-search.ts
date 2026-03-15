import { supabase } from '@/lib/supabase/client'

export type AISearchResponse = {
  type: 'institutional' | 'products' | 'technical' | 'not_found'
  message: string
  product_ids: string[]
}

export const performAISearch = async (
  query: string,
): Promise<{ data: AISearchResponse | null; error: any }> => {
  const { data, error } = await supabase.functions.invoke<AISearchResponse>('ai-search', {
    body: { query },
  })
  return { data, error }
}
