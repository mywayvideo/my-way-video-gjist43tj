import { createClient } from '@supabase/supabase-js'
import { supabase as defaultSupabase } from '@/lib/supabase/client'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string)

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : defaultSupabase

export const getIntelligences = async () => {
  try {
    const { data, error } = await supabase
      .from('market_intelligence')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching intelligences:', error)
    return []
  }
}

export const ingestManualKnowledge = async (payload: {
  title: string
  source_url?: string
  raw_content?: string
  status?: string
}) => {
  try {
    const { data, error } = await supabase
      .from('market_intelligence')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error ingesting knowledge:', error)
    return null
  }
}

export const updateIntelligenceStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await supabase
      .from('market_intelligence')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating intelligence status:', error)
    return null
  }
}

export const deleteIntelligence = async (id: string) => {
  try {
    const { error } = await supabase.from('market_intelligence').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting intelligence:', error)
    return false
  }
}

export const processKnowledgeUrl = async (payload: {
  url?: string
  raw_content?: string
  manufacturer_id?: string
  record_id?: string
}) => {
  try {
    const { data, error } = await supabase.functions.invoke('process-knowledge', {
      body: payload,
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error processing knowledge url:', error)
    return null
  }
}
