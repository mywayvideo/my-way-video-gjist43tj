import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateExpertResponse, getAISettings } from '@/services/intelligence'

export function useUnifiedSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const fetchUnifiedData = async (query: string) => {
    const settings = await getAISettings()

    let products: any[] = []
    let cache: any[] = []
    let nab: any[] = []

    try {
      const { data: searchData, error: searchError } = await supabase.rpc('unified_search', {
        search_term: query,
      })

      if (searchError) {
        console.error('Error calling unified_search:', searchError)
      } else if (searchData) {
        const responseObj = searchData as any
        products = responseObj.stock || []
        cache = responseObj.intel || []
        nab = responseObj.nab_data || []
      }
    } catch (e) {
      console.error('RPC unified_search failed', e)
    }

    let finalProducts = products.length > 0 ? products : []

    // Respect stock visibility settings
    if (!settings?.ignore_stock_count) {
      finalProducts = finalProducts.filter((p: any) => p.stock && p.stock > 0)
    }

    return {
      stock: finalProducts,
      products: finalProducts,
      intel: cache,
      nabData: nab,
      web: [],
      settings: settings || {},
      isNewlyCached: false,
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
      console.error('[useUnifiedSearch] error:', err)

      const fallbackResults = {
        message: 'Ocorreu um erro ao consultar nossa base de dados. Por favor, tente novamente.',
        content:
          'Ocorreu um erro ao consultar nossa base de dados. Por favor, tente novamente.\n\nDisponível para envio imediato de Miami com garantia no Brasil e América Latina.',
        confidence_level: 'low',
        stock: [],
        products: [],
        intel: [],
        nabData: [],
        web: [],
        agent_name: 'Busca Básica',
        should_show_whatsapp_button: true,
      }

      setResults(fallbackResults)
      toast({
        title: 'Erro de Busca',
        description: 'Ocorreu um erro ao consultar nossa base de dados.',
        variant: 'destructive',
      })
      return fallbackResults
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}

export const useAiSearch = useUnifiedSearch
