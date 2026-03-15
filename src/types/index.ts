export type Product = {
  id: string
  name: string
  sku: string | null
  description: string | null
  price_brl: number
  stock: number
  image_url: string | null
  ncm: string | null
  weight: number | null
  dimensions: string | null
  category: string | null
  is_special: boolean
  created_at?: string
}

export type CompanyInfo = {
  id: string
  content: string
  updated_at: string
}
