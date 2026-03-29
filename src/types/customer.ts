export interface Customer {
  id: string
  user_id: string
  full_name: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  company_name: string | null
  profile_photo_url: string | null
  cpf: string | null
  created_at: string
  updated_at: string
  email?: string
}

export interface CustomerAddress {
  id: string
  customer_id: string
  address_type: 'shipping' | 'billing'
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip_code: string
  country: string
  is_default: boolean
  created_at: string
  updated_at: string
}
