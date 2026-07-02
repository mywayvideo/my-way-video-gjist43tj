import { supabase } from '@/lib/supabase/client'

export interface TaggedCustomer {
  id: string
  customer_id: string
  email: string | null
  tag_reason: string
  metadata: Record<string, unknown> | null
  created_at: string
  customers: { full_name: string | null; email: string | null } | null
}

export const customerTaggingService = {
  async fetchTagged(filter?: string): Promise<TaggedCustomer[]> {
    let query = (supabase as any)
      .from('customer_tagging')
      .select('*, customers(full_name, email)')
      .order('created_at', { ascending: false })

    if (filter && filter !== 'all') {
      query = query.eq('tag_reason', filter)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as TaggedCustomer[]
  },

  async removeCustomer(customerId: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', customerId)
    if (error) throw error
  },

  async clearTag(tagId: string): Promise<void> {
    const { error } = await (supabase as any).from('customer_tagging').delete().eq('id', tagId)
    if (error) throw error
  },

  async runScan(): Promise<number> {
    const { data, error } = await (supabase as any).rpc('scan_customer_spam')
    if (error) throw error
    return (data as number) || 0
  },
}
