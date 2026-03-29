import { supabase } from '@/lib/supabase/client'
import { Customer, CustomerAddress } from '@/types/customer'

export const customerService = {
  async getProfile(): Promise<Customer | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return {
      ...data,
      email: user.email,
    } as Customer
  },

  async updateProfile(id: string, updates: Partial<Customer>): Promise<void> {
    if (updates.email) {
      const { error } = await supabase.auth.updateUser({ email: updates.email })
      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('email_in_use')
        }
        throw new Error('network_error')
      }
      delete updates.email
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('customers').update(updates).eq('id', id)

      if (error) throw new Error('network_error')
    }
  },

  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error('network_error')
    return data as CustomerAddress[]
  },

  async addAddress(
    address: Omit<CustomerAddress, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<void> {
    if (address.is_default) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', address.customer_id)
        .eq('address_type', address.address_type)
    }

    const { error } = await supabase.from('customer_addresses').insert([address])
    if (error) throw new Error('network_error')
  },

  async updateAddress(id: string, updates: Partial<CustomerAddress>): Promise<void> {
    if (updates.is_default) {
      const { data } = await supabase
        .from('customer_addresses')
        .select('customer_id, address_type')
        .eq('id', id)
        .single()
      if (data) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', data.customer_id)
          .eq('address_type', data.address_type)
      }
    }

    const { error } = await supabase.from('customer_addresses').update(updates).eq('id', id)
    if (error) throw new Error('network_error')
  },

  async deleteAddress(id: string): Promise<void> {
    const { error } = await supabase.from('customer_addresses').delete().eq('id', id)
    if (error) throw new Error('address_not_found')
  },

  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}/profile-${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, { upsert: true })
    if (error) throw new Error('network_error')

    const { data } = supabase.storage.from('profiles').getPublicUrl(filePath)
    return data.publicUrl
  },
}
