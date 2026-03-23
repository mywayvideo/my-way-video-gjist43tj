import { supabase } from '@/lib/supabase/client'

export const searchProducts = async (query: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*, manufacturer:manufacturers(*)')
    .or(
      `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,sku.ilike.%${query}%`,
    )
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Database search error:', error)
    throw error
  }

  return data || []
}
