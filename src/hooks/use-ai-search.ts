import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string, sessionId?: string) => {
    setIsLoading(true)

    try {
      // Dual-query strategy
      // Query A: Search existing records in the 'products' table
      const { data: products } = await supabase
        .from('products')
        .select('id, name, description, technical_info, price_usd, is_discontinued')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5)

      // Query B: Search records in 'market_intelligence' where status is 'published'
      const { data: intelligence } = await supabase
        .from('market_intelligence')
        .select('title, raw_content, event_name, source_url')
        .eq('status', 'published')
        .or(`title.ilike.%${query}%,raw_content.ilike.%${query}%`)
        .limit(5)

      let systemPromptModifier = ''
      if (intelligence && intelligence.length > 0) {
        systemPromptModifier =
          "If a match is found in intelligence but not in products, explain it as a 'Market Update' or 'NAB Launch'. Prioritize this technical knowledge when answering about new technologies or NAB launches."
      }

      const contextualQuery = `${systemPromptModifier ? `[SYSTEM INSTRUCTION: ${systemPromptModifier}]\n\n` : ''}[MARKET INTELLIGENCE CONTEXT: ${JSON.stringify(intelligence)}]\n\nUser Query: ${query}`

      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: {
          query: contextualQuery,
          session_id: sessionId,
        },
      })

      if (error) throw error

      if (data && products && products.length > 0) {
        if (!data.referenced_internal_products) {
          data.referenced_internal_products = []
        }
        const existingIds = new Set(data.referenced_internal_products.map((p: any) => p.id))
        for (const p of products) {
          if (!existingIds.has(p.id)) {
            data.referenced_internal_products.push(p)
          }
        }
      }

      setResults(data)
      return data
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao buscar informações técnicas',
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}
