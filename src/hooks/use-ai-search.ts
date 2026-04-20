import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateExpertResponse, getAISettings } from '@/services/intelligence'
import { saveToCache } from '@/services/cache-service'

export function useUnifiedSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const fetchUnifiedData = async (query: string) => {
    const settings = await getAISettings()

    let products: any[] | null = null
    let cache: any[] | null = null
    let nab: any[] | null = null
    let isNewlyCached = false

    try {
      const { data: searchData, error: searchError } = await supabase.rpc('unified_search', {
        search_term: query,
      })

      if (searchError) {
        console.error('Error calling unified_search:', searchError)
      } else if (searchData) {
        products = (searchData as any).stock || []
        cache = (searchData as any).intel || []
        nab = (searchData as any).nab_data || []
      }
    } catch (e) {
      console.error('RPC unified_search failed', e)
    }

    let webResults: any = null

    // Web Search Fallback
    if (
      (!products || products.length === 0) &&
      (!cache || cache.length === 0) &&
      (!nab || nab.length === 0)
    ) {
      try {
        const { data: aiSearchData, error: aiSearchError } = await supabase.functions.invoke(
          'ai-search',
          { body: { query: query } },
        )

        if (!aiSearchError && aiSearchData && aiSearchData.message) {
          webResults = {
            title: `Pesquisa Web: ${query}`,
            raw_content: aiSearchData.message,
            source: 'web',
          }

          if (
            aiSearchData.referenced_internal_products &&
            aiSearchData.referenced_internal_products.length > 0
          ) {
            products = [...(products || []), ...aiSearchData.referenced_internal_products]
          }

          // 4. Save to Cache
          await saveToCache({
            title: webResults.title,
            raw_content: webResults.raw_content,
            source_url: `https://mywayvideo.com/search?q=${encodeURIComponent(query)}`,
          })
          isNewlyCached = true
        }
      } catch (e) {
        console.error('Web search fallback failed', e)
      }
    }

    let finalProducts = products && products.length > 0 ? products : []

    // 5. Respect stock visibility settings
    // If ignore_stock_count is true, we return products even if stock is 0
    if (!settings?.ignore_stock_count) {
      finalProducts = finalProducts.filter((p: any) => p.stock && p.stock > 0)
    }

    return {
      stock: finalProducts,
      products: finalProducts,
      intel: cache || [],
      nabData: nab || [],
      web: webResults ? [webResults] : [],
      settings: settings || {},
      isNewlyCached,
    }
  }

  const search = async (query: string) => {
    if (!query) return

    setIsLoading(true)
    setResults(null)

    try {
      const activeAgent = await getActiveAgent()
      const unifiedData = await fetchUnifiedData(query)

      let finalMessage = ''
      let finalConfidence = 'high'
      let finalProducts = unifiedData.products
      let shouldShowWhatsapp = false

      if (!activeAgent) {
        finalMessage =
          'Nenhum agente de IA configurado. Exibindo resultados da base unificada.\n\nDisponível para envio imediato de Miami com garantia no Brasil e América Latina.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        const aiResponse = await generateExpertResponse(query, unifiedData, activeAgent.id)
        finalMessage = aiResponse.content
        finalConfidence = aiResponse.confidence_level || 'high'
        if (aiResponse.products && aiResponse.products.length > 0) {
          finalProducts = aiResponse.products
        }
        shouldShowWhatsapp = aiResponse.should_show_whatsapp_button || false
      }

      const combinedResults = {
        message: finalMessage,
        content: finalMessage,
        confidence_level: finalConfidence,
        stock: unifiedData.stock,
        products: finalProducts,
        intel: unifiedData.intel,
        nabData: unifiedData.nabData,
        web: unifiedData.web,
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
        should_show_whatsapp_button: shouldShowWhatsapp,
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
