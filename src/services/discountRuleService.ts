import { supabase } from '@/lib/supabase/client'

export const discountRuleService = {
  async fetchDiscountRule(ruleId: string) {
    const { data, error } = await supabase
      .from('discount_rules')
      .select('*')
      .eq('id', ruleId)
      .single()
    if (error) throw error
    return data
  },
  async fetchManufacturers() {
    const { data, error } = await supabase.from('manufacturers').select('id, name').order('name')
    if (error) throw error
    return data || []
  },
  async fetchCategories() {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)
    if (error) throw error
    const uniqueCategories = Array.from(
      new Set((data || []).map((d) => d.category).filter(Boolean)),
    )
    return uniqueCategories
      .map((c) => ({ id: c as string, name: c as string }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
  async fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, manufacturer_id, category, price_usd')
      .order('name')
    if (error) throw error
    return data || []
  },
  async fetchCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, email')
      .order('full_name')
    if (error) throw error
    return (data || []).map((c) => ({
      id: c.id,
      name: c.full_name || c.email || 'Cliente sem nome',
    }))
  },
  async saveDiscountRule(data: any) {
    const payload = {
      rule_name: data.name,
      discount_calculation_type: data.discount_type,
      discount_value: data.value,
      scope_type: data.scope,
      scope_data: data.scope_data,
      application_type: data.application_type,
      role: data.role,
      rule_type: data.role || 'custom',
      customers: data.customers,
      start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
      end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
      is_active: data.status === 'active',
    }

    if (data.id) {
      const { error } = await supabase
        .from('discount_rules')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', data.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('discount_rules').insert(payload)
      if (error) throw error
    }
  },
  async deleteDiscountRule(ruleId: string) {
    const { error } = await supabase.from('discount_rules').delete().eq('id', ruleId)
    if (error) throw error
  },
}
