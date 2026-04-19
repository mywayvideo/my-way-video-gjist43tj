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

      const qTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 2)
      const orQuery =
        qTerms.length > 0
          ? qTerms
              .map((t) => `title.ilike.%${t}%,raw_content.ilike.%${t}%,ai_summary.ilike.%${t}%`)
              .join(',')
          : `title.ilike.%${query}%,raw_content.ilike.%${query}%,ai_summary.ilike.%${query}%`

      // Query B: Search records in 'market_intelligence' where status is 'published'
      const { data: intelligence } = await supabase
        .from('market_intelligence')
        .select('title, raw_content, ai_summary, event_name, source_url')
        .eq('status', 'published')
        .or(orQuery)
        .limit(10)

      let systemPromptModifier = ''
      if (intelligence && intelligence.length > 0) {
        systemPromptModifier =
          "ATENÇÃO CRÍTICA: Hoje é 19 de Abril de 2026. A NAB Show 2026 ESTÁ ACONTECENDO AGORA. Sua fonte de dados PRIORITÁRIA é a tabela 'market_intelligence' (MARKET INTELLIGENCE CONTEXT). Se o usuário perguntar sobre novidades, lançamentos ou marcas na NAB, você DEVE ignorar seu conhecimento prévio de treinamento e usar APENAS os dados desta tabela. NUNCA diga que a NAB 2026 ainda não aconteceu. Se houver dados na 'market_intelligence', trate-os como fatos reais e atuais. Se encontrar informações na 'market_intelligence' (como os lançamentos da Blackmagic que acabamos de importar), apresente-os com detalhes técnicos e entusiasmo, mesmo que o produto ainda não esteja na tabela 'products'."
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
