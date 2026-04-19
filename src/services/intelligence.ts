import { supabase } from '@/lib/supabase/client'

export const getIntelligences = async () => {
  const { data, error } = await supabase
    .from('market_intelligence')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const ingestManualKnowledge = async (payload: {
  title: string
  source_url?: string
  raw_content?: string
  status?: string
}) => {
  const { data, error } = await supabase
    .from('market_intelligence')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateIntelligenceStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from('market_intelligence')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteIntelligence = async (id: string) => {
  const { error } = await supabase.from('market_intelligence').delete().eq('id', id)
  if (error) throw error
}

export const processKnowledgeUrl = async (payload: {
  url?: string
  raw_content?: string
  manufacturer_id?: string
  record_id?: string
}) => {
  const { data, error } = await supabase.functions.invoke('process-knowledge', {
    body: payload,
  })
  if (error) throw error
  return data
}
