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
          "Sempre que um usuário perguntar sobre novidades, lançamentos ou tecnologias da NAB 2026, você deve consultar o contexto de 'MARKET INTELLIGENCE' fornecido antes de qualquer outra fonte. Se encontrar uma informação lá que não existe nos produtos, responda com entusiasmo técnico: 'Temos uma atualização quente da NAB 2026 sobre isso! Nossos especialistas coletaram o seguinte: [resumo].'. Mencione sempre que são 'Lançamentos Recentes' e ofereça o botão de falar com especialista para pré-venda ou reservas. NUNCA invente informações de produtos que não estejam no contexto."
      }

      const contextualQuery = `${systemPromptModifier ? `[SYSTEM INSTRUCTION: ${systemPromptModifier}]\n\n` : ''}[MARKET INTELLIGENCE CONTEXT: ${JSON.stringify(intelligence)}]\n\nUser Query: ${query}`

      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: {
          query: contextualQuery,
          session_id: sessionId,
        },
      })

      if (error) throw error

      if (data) {
        data.has_nab_intelligence = intelligence && intelligence.length > 0
      }

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
