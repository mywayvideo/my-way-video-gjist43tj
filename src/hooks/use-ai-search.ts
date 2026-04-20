import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateResponse, ingestManualKnowledge } from '@/services/intelligence'

export function useUnifiedSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string) => {
    if (!query || !query.trim()) return

    setIsLoading(true)
    setResults(null)

    try {
      const activeAgent = await getActiveAgent()
      const fallbackTerm = query.trim()

      const words = fallbackTerm.split(/\s+/).filter((w) => w.length > 1)
      const safeWords = words.map((w) => w.replace(/[%_\\]/g, '\\$&'))

      // STEP 1: Local Stock (products)
      const productsOr =
        safeWords.length > 0
          ? safeWords
              .map((w) => `name.ilike.%${w}%,sku.ilike.%${w}%,description.ilike.%${w}%`)
              .join(',')
          : `name.ilike.%${fallbackTerm.replace(/[%_\\]/g, '\\$&')}%,sku.ilike.%${fallbackTerm.replace(/[%_\\]/g, '\\$&')}%,description.ilike.%${fallbackTerm.replace(/[%_\\]/g, '\\$&')}%`

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, manufacturers(name)')
        .or(productsOr)
        .limit(20)

      if (productsError) throw productsError

      // STEP 2 & 3: AI Cache / NAB
      const newsOr =
        safeWords.length > 0
          ? safeWords.map((w) => `title.ilike.%${w}%,raw_content.ilike.%${w}%`).join(',')
          : `title.ilike.%${fallbackTerm.replace(/[%_\\]/g, '\\$&')}%,raw_content.ilike.%${fallbackTerm.replace(/[%_\\]/g, '\\$&')}%`

      const { data: intelligenceData, error: newsError } = await supabase
        .from('market_intelligence')
        .select('*')
        .or(newsOr)
        .limit(10)

      if (newsError) throw newsError

      let webData: any = null

      // STEP 4: Web Fallback
      if (
        (!productsData || productsData.length === 0) &&
        (!intelligenceData || intelligenceData.length === 0)
      ) {
        try {
          const { data: aiSearchData, error: aiSearchError } = await supabase.functions.invoke(
            'ai-search',
            { body: { query: fallbackTerm } },
          )

          if (!aiSearchError && aiSearchData && aiSearchData.message) {
            webData = {
              title: `Pesquisa Web: ${fallbackTerm}`,
              raw_content: aiSearchData.message,
              source: 'web',
            }

            // DATA SYNC: IMMEDIATELY save to cache
            await ingestManualKnowledge({
              title: webData.title,
              raw_content: webData.raw_content,
              status: 'published',
            })
          }
        } catch (e) {
          console.error('Web search fallback failed', e)
        }
      }

      // OUTPUT: Consolidate
      const unifiedContext = {
        products: productsData || [],
        intelligence: intelligenceData || [],
        web: webData ? [webData] : [],
      }

      const hasProducts = unifiedContext.products.length > 0
      const hasIntelligence = unifiedContext.intelligence.length > 0
      const hasWeb = unifiedContext.web.length > 0
      const hasAnyResult = hasProducts || hasIntelligence || hasWeb

      let message = ''
      if (!activeAgent) {
        message = 'Nenhum agente de IA configurado. Exibindo resultados da base unificada.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        message = await generateResponse(query, unifiedContext, activeAgent.id)
      }

      const combinedResults = {
        message,
        products: unifiedContext.products,
        news: [...unifiedContext.intelligence, ...unifiedContext.web],
        should_show_whatsapp_button: !hasProducts,
        confidence_level: hasProducts ? 'high' : hasAnyResult ? 'high' : 'low',
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
        has_nab_intelligence: hasIntelligence || hasWeb,
        is_nab_query: fallbackTerm.toLowerCase().includes('nab'),
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
