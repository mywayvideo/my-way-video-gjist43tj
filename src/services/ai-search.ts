import { supabase } from '@/lib/supabase/client'

export interface AISearchResponse {
  success: boolean
  response: string
  data?: {
    stock: any[]
    pc: any[]
    psc: any[]
    mi: any[]
  }
  error?: string
}

export const performAISearch = async (query: string): Promise<AISearchResponse> => {
  const { data, error } = await supabase.functions.invoke('execute_ai_search_v2', {
    body: { query },
  })

  if (error) {
    throw error
  }

  return data as AISearchResponse
}
