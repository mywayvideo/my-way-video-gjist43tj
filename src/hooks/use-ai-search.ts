import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateExpertResponse, ingestManualKnowledge } from '@/services/intelligence'

export function useUnifiedSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const fetchUnifiedData = async (query: string) => {
    const rawQuery = query

    // 1. CONST products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*, manufacturers(name)')
      .or('name.ilike.%' + rawQuery + '%,sku.ilike.%' + rawQuery + '%')
      .limit(20)

    if (productsError) throw productsError

    // 2. CONST cache
    const { data: cache, error: cacheError } = await supabase
      .from('market_intelligence')
      .select('*')
      .ilike('raw_content', '%' + rawQuery + '%')
      .limit(10)

    if (cacheError) throw cacheError

    let webResults: any = null

    // 3. IF (products.length === 0 && cache.length === 0)
    if ((!products || products.length === 0) && (!cache || cache.length === 0)) {
      try {
        const { data: aiSearchData, error: aiSearchError } = await supabase.functions.invoke(
          'ai-search',
          { body: { query: rawQuery } },
        )

        if (!aiSearchError && aiSearchData && aiSearchData.message) {
          webResults = {
            title: `Pesquisa Web: ${rawQuery}`,
            raw_content: aiSearchData.message,
            source: 'web',
          }

          // DATA SYNC
          await ingestManualKnowledge({
            title: webResults.title,
            raw_content: webResults.raw_content,
            status: 'published',
          })
        }
      } catch (e) {
        console.error('Web search fallback failed', e)
      }
    }

    return {
      stock: products || [],
      intel: cache || [],
      web: webResults ? [webResults] : [],
    }
  }

  const search = async (query: string) => {
    if (!query) return

    setIsLoading(true)
    setResults(null)

    try {
      const activeAgent = await getActiveAgent()
      const unifiedData = await fetchUnifiedData(query)

      let message = ''
      if (!activeAgent) {
        message = 'Nenhum agente de IA configurado. Exibindo resultados da base unificada.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        message = await generateExpertResponse(query, unifiedData, activeAgent.id)
      }

      const combinedResults = {
        message,
        stock: unifiedData.stock,
        intel: unifiedData.intel,
        web: unifiedData.web,
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
      }

      setResults(combinedResults)
      return combinedResults
    } catch (err: any) {
      console.error('[useUnifiedSearch] Database query error:', err)
      setResults(null)
      toast({
        title: 'Erro de Busca',
        description: 'Ocorreu um erro ao consultar nossa base de dados.',
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}

export const useAiSearch = useUnifiedSearch
