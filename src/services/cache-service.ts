import { supabase } from '@/lib/supabase/client'

export async function saveToCache(params: {
  title: string
  raw_content: string
  source_url?: string
}) {
  try {
    const { data: existing } = await supabase
      .from('market_intelligence')
      .select('id')
      .ilike('title', params.title)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return existing
    }

    const payload = {
      title: params.title,
      raw_content: params.raw_content,
      source_url: params.source_url || null,
      status: 'published',
      event_name: 'NAB 2026',
      metadata: { tags: ['WebSearch', 'NAB 2026'] },
    }

    const { data, error } = await supabase
      .from('market_intelligence')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error('[cache-service] Failed to save to cache:', error)
      return null
    }

    return data
  } catch (e) {
    console.error('[cache-service] Exception saving to cache:', e)
    return null
  }
}
