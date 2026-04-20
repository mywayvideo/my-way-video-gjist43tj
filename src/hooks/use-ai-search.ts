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
    const cacheExpirationDays = settings?.cache_expiration_days || 30

    let products: any[] | null = null
    let isNewlyCached = false

    // 1. Dynamic SQL Execution Check (1st Priority)
    if (settings?.search_algorithm_sql) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('execute_search_algorithm', {
          sql_query: settings.search_algorithm_sql,
          search_term: query,
        })
        if (!rpcError && rpcData) {
          products = rpcData
        }
      } catch (e) {
        console.error('Custom SQL execution failed, falling back to standard search', e)
      }
    }

    if (!products) {
      // 2. Standard Search (2nd Priority)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, manufacturers(name)')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)

      if (productsError) {
        console.error(productsError)
      }
      products = productsData
    }

    // Cache
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() - cacheExpirationDays)

    const { data: cache, error: cacheError } = await supabase
      .from('market_intelligence')
      .select('*')
      .ilike('raw_content', `%${query}%`)
      .gte('created_at', expirationDate.toISOString())

    if (cacheError) {
      console.error(cacheError)
    }

    // NAB
    const { data: nab, error: nabError } = await supabase
      // @ts-expect-error - table might not be generated in types yet
      .from('nab_market')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)

    if (nabError && nabError.code !== '42P01') {
      console.error(nabError)
    }

    let webResults: any = null

    // 3. Web Search Fallback (3rd Priority)
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
    if (settings && settings.ignore_stock_count === false) {
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

      if (!activeAgent) {
        finalMessage =
          'Nenhum agente de IA configurado. Exibindo resultados da base unificada.\n\nDisponível para envio imediato de Miami com garantia no Brasil.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        const aiResponse = await generateExpertResponse(query, unifiedData, activeAgent.id)
        finalMessage = aiResponse.content
        finalConfidence = aiResponse.confidence_level || 'high'
      }

      const combinedResults = {
        message: finalMessage,
        content: finalMessage,
        confidence_level: finalConfidence,
        stock: unifiedData.stock,
        products: unifiedData.products,
        intel: unifiedData.intel,
        nabData: unifiedData.nabData,
        web: unifiedData.web,
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
        should_show_whatsapp_button: false,
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
