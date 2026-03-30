import { supabase } from '@/lib/supabase/client'

export async function fetchAllCustomers(
  page: number,
  limit: number,
  searchTerm: string,
  statusFilter: string,
) {
  let query = supabase.from('customers').select('*', { count: 'exact' })

  if (searchTerm) {
    query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
  }

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error

  return { customers: data || [], total: count || 0 }
}

export async function updateCustomer(customerId: string, data: any) {
  const { error } = await supabase
    .from('customers')
    .update({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      company_name: data.company_name,
      role: data.role,
      status: data.status,
    })
    .eq('id', customerId)
  if (error) throw error
}

export async function updateBillingAddress(customerId: string, address: any) {
  const { error } = await supabase
    .from('customers')
    .update({ billing_address: address })
    .eq('id', customerId)
  if (error) throw error
}

export async function updateShippingAddress(customerId: string, address: any) {
  const { error } = await supabase
    .from('customers')
    .update({ shipping_address: address })
    .eq('id', customerId)
  if (error) throw error
}

export async function changeCustomerPassword(
  customerId: string,
  newPassword: string,
  sendEmail: boolean,
) {
  const { data, error } = await supabase.functions.invoke('change-customer-password', {
    body: { customerId, newPassword, sendEmail },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function deleteCustomer(customerId: string) {
  const { error } = await supabase.from('customers').delete().eq('id', customerId)
  if (error) throw error
}

export async function resetCustomer2FA(customerId: string) {
  const { error } = await supabase
    .from('customers')
    .update({ two_factor_enabled: false })
    .eq('id', customerId)
  if (error) throw error
}

export async function createCustomer(data: any) {
  const { data: res, error } = await supabase.functions.invoke('create-customer', {
    body: data,
  })
  if (error) throw error
  if (res?.error) throw new Error(res.error)
  return res
}

export async function sendConfirmationEmail(customerId: string) {
  const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
    body: { customerId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
