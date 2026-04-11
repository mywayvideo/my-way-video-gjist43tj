import { supabase } from '@/lib/supabase/client'
import { ProductFormData } from '@/types/product'

export const productService = {
  async getCategories() {
    const { data, error } = await supabase.from('categories').select('id, name').order('name')
    if (error) throw error
    return data || []
  },

  async checkSkuExists(sku: string) {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw error
    return !!data
  },

  async extractFromUrl(url: string) {
    const { data, error } = await supabase.functions.invoke('extract-product-bhphoto', {
      body: { url },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  async calculateBrl(price_usa: number, weight: number) {
    const { data, error } = await supabase.functions.invoke('calculate-price-brl', {
      body: { price_usa, weight },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data.price_brl
  },

  async suggestNcm(description: string) {
    const { data, error } = await supabase.functions.invoke('validate-ncm-suggestion', {
      body: { description },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  async getManufacturers() {
    const { data, error } = await supabase.from('manufacturers').select('id, name').order('name')
    if (error) throw error
    return data || []
  },

  async createProduct(productData: any) {
    const { price_usa, ...rest } = productData
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...rest,
        price_usd: price_usa || 0,
        price_cost: productData.price_cost || 0,
        price_brl: productData.price_brl || 0,
        stock: productData.stock || 0,
        image_url: productData.image_url || null,
        technical_info: productData.technical_info || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
