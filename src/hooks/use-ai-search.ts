import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateAgentResponse } from '@/services/intelligence'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string) => {
    if (!query || !query.trim()) return

    setIsLoading(true)

    try {
      const activeAgent = await getActiveAgent()
      const term = query.trim()

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, manufacturers(name)')
        .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
        .limit(20)

      if (productsError) throw productsError

      const { data: newsData, error: newsError } = await supabase
        .from('market_intelligence')
        .select('*')
        .or(`title.ilike.%${term}%,raw_content.ilike.%${term}%`)
        .limit(5)

      if (newsError) throw newsError

      const contextData = {
        products: productsData || [],
        news: newsData || [],
      }

      const hasProducts = contextData.products.length > 0
      const hasNews = contextData.news.length > 0

      let message = ''
      if (!activeAgent) {
        message = 'Nenhum agente de IA configurado. Exibindo resultados básicos de busca.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        message = await generateAgentResponse(query, contextData, activeAgent.id)
      }

      const combinedResults = {
        message,
        products: contextData.products,
        news: contextData.news,
        should_show_whatsapp_button: !hasProducts,
        confidence_level: hasProducts ? 'high' : 'low',
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
        has_nab_intelligence: hasNews,
        is_nab_query: hasNews,
      }

      setResults(combinedResults)
      return combinedResults
    } catch (err: any) {
      console.error('[useAiSearch] Database query error:', err)
      setResults(null)
      toast({
        title: 'Erro',
        description: 'Erro ao consultar base de dados.',
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}
