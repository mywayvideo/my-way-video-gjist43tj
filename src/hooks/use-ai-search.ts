import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  getActiveAgent,
  generateAgentResponse,
  ingestManualKnowledge,
} from '@/services/intelligence'

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
      const searchPattern = `%${term}%`

      // STEP 1: Local Stock
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, manufacturers(name)')
        .or(
          `name.ilike.${searchPattern},sku.ilike.${searchPattern},description.ilike.${searchPattern}`,
        )
        .limit(20)

      if (productsError) throw productsError

      // STEP 2: AI Cache
      const { data: newsData, error: newsError } = await supabase
        .from('market_intelligence')
        .select('*')
        .or(`title.ilike.${searchPattern},raw_content.ilike.${searchPattern}`)
        .limit(10)

      if (newsError) throw newsError

      let webData: any = null
      let usedWebSearch = false

      // STEP 3: Web Fallback
      if ((!productsData || productsData.length === 0) && (!newsData || newsData.length === 0)) {
        try {
          const { data: aiSearchData, error: aiSearchError } = await supabase.functions.invoke(
            'ai-search',
            {
              body: { query: term },
            },
          )

          if (!aiSearchError && aiSearchData && aiSearchData.message) {
            webData = {
              title: `Pesquisa Web: ${term}`,
              raw_content: aiSearchData.message,
              source: 'web',
            }
            usedWebSearch = true

            // IMMEDIATELY save it to 'market_intelligence' with status 'published'
            await ingestManualKnowledge({
              title: `Pesquisa Web: ${term}`,
              raw_content: aiSearchData.message,
              status: 'published',
            })
          }
        } catch (e) {
          console.error('Web search fallback failed', e)
        }
      }

      const unifiedContext = {
        products: productsData || [],
        news: newsData || [],
        web: webData ? [webData] : [],
      }

      const hasProducts = unifiedContext.products.length > 0
      const hasNews = unifiedContext.news.length > 0
      const hasWeb = unifiedContext.web.length > 0
      const hasAnyResult = hasProducts || hasNews || hasWeb

      let message = ''
      if (!activeAgent) {
        message = 'Nenhum agente de IA configurado. Exibindo resultados da base unificada.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        message = await generateAgentResponse(query, unifiedContext, activeAgent.id)
      }

      const combinedResults = {
        message,
        products: unifiedContext.products,
        news: [...unifiedContext.news, ...unifiedContext.web],
        should_show_whatsapp_button: !hasAnyResult,
        confidence_level: hasAnyResult ? 'high' : 'low',
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
        has_nab_intelligence: hasNews || hasWeb,
        is_nab_query: hasNews || hasWeb || term.toLowerCase().includes('nab'),
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
