import { supabase } from '@/lib/supabase/client'

export const searchProducts = async (query: string) => {
  try {
    if (!query || !query.trim()) return []

    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, category, price_usd, image_url, sku')
      .eq('is_discontinued', false)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('Database search error:', error)
      return []
    }

    const sortedData = (data || []).sort((a, b) => {
      if (a.sku?.toLowerCase() === query.toLowerCase()) return -1
      if (b.sku?.toLowerCase() === query.toLowerCase()) return 1
      return 0
    })

    return sortedData
  } catch (error) {
    console.error('Database search error exception:', error)
    return []
  }
}
