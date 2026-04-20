import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateExpertResponse, getAISettings } from '@/services/intelligence'

export function useUnifiedSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const accumulatedContext = useRef<{ products: any[]; intel: any[]; nabData: any[] }>({
    products: [],
    intel: [],
    nabData: [],
  })

  const fetchUnifiedData = async (query: string) => {
    const cleanQuery = query.trim()
    const settings = await getAISettings()

    let products: any[] = []
    let cache: any[] = []
    let nab: any[] = []

    try {
      const sqlString = settings?.search_algorithm_sql || ''
      const executedSql = sqlString.replace(/\$1/g, cleanQuery)
      console.log('SQL BEING EXECUTED:', executedSql)

      const { data: searchData, error: searchError } = await supabase.rpc('unified_search', {
        search_term: cleanQuery,
      })

      if (searchError) {
        console.error('Error calling unified_search:', searchError)
      } else if (searchData) {
        const responseObj = searchData as any
        products = responseObj.stock || []
        cache = responseObj.intel || []
        nab = responseObj.nab_data || []
      }

      // Augment products with full_specs if not present
      if (products.length > 0 && !products[0].full_specs && !products[0].technical_info) {
        const productIds = products.map((p: any) => p.id)
        const { data: fullProducts } = await supabase
          .from('products')
          .select('id, technical_info, description, price_usd, name, image_url, stock')
          .in('id', productIds)
        if (fullProducts) {
          products = products.map((p: any) => {
            const fullP = fullProducts.find((fp) => fp.id === p.id)
            return fullP ? { ...p, ...fullP, full_specs: fullP.technical_info } : p
          })
        }
      }

      // Augment nab_data with content if not present
      if (nab.length > 0 && !nab[0].content) {
        const nabIds = nab.map((n: any) => n.id)
        const { data: fullNab } = await supabase
          .from('nab_market')
          .select('id, title, content')
          .in('id', nabIds)
        if (fullNab) {
          nab = nab.map((n: any) => {
            const fullN = fullNab.find((fn) => fn.id === n.id)
            return fullN ? { ...n, ...fullN } : n
          })
        }
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

  const search = async (rawQuery: string) => {
    const cleanQuery = rawQuery.trim()
    if (!cleanQuery) return

    setIsLoading(true)
    setResults(null)

    try {
      const activeAgent = await getActiveAgent()
      const unifiedData = await fetchUnifiedData(cleanQuery)

      // Accumulate context
      const newProducts = unifiedData.stock || []
      const newIntel = unifiedData.intel || []
      const newNab = unifiedData.nabData || []

      const mergedProducts = [...accumulatedContext.current.products, ...newProducts].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
      )
      const mergedIntel = [...accumulatedContext.current.intel, ...newIntel].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
      )
      const mergedNab = [...accumulatedContext.current.nabData, ...newNab].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
      )

      accumulatedContext.current = {
        products: mergedProducts,
        intel: mergedIntel,
        nabData: mergedNab,
      }

      const accumulatedUnifiedData = {
        ...unifiedData,
        stock: mergedProducts,
        products: mergedProducts,
        intel: mergedIntel,
        nabData: mergedNab,
      }

      let finalMessage = ''
      let finalConfidence = 'high'
      let finalProducts = accumulatedUnifiedData.products
      let shouldShowWhatsapp = false

      if (!activeAgent) {
        finalMessage =
          'Nenhum agente de IA configurado. Exibindo resultados da base unificada.\n\nTodos os produtos possuem garantia oficial no Brasil e América Latina, com envio direto de Miami.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        const contextString = JSON.stringify({
          stock: accumulatedUnifiedData.stock,
          intel: accumulatedUnifiedData.intel,
          nab_data: accumulatedUnifiedData.nabData,
        })
        console.log('Search Context Sent to AI:', contextString)
        const aiResponse = await generateExpertResponse(
          cleanQuery,
          { ...accumulatedUnifiedData, stringifiedContext: contextString },
          activeAgent.id,
        )
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
        stock: accumulatedUnifiedData.stock,
        products: finalProducts,
        intel: accumulatedUnifiedData.intel,
        nabData: accumulatedUnifiedData.nabData,
        web: accumulatedUnifiedData.web,
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
        should_show_whatsapp_button: shouldShowWhatsapp,
      }

      console.log('DATABASE_SEARCH_RESULTS:', combinedResults)
      console.log('DATA_FOUND:', combinedResults.stock?.length || 0)

      setResults(combinedResults)
      return combinedResults
    } catch (err: any) {
      console.error('[useUnifiedSearch] error:', err)

      const fallbackResults = {
        message:
          err?.message ||
          'Desculpe, ocorreu um erro ao consultar nossos sistemas. Por favor, tente novamente.',
        content:
          err?.message ||
          'Desculpe, ocorreu um erro ao consultar nossos sistemas. Por favor, tente novamente.',
        confidence_level: 'low',
        stock: [],
        products: [],
        intel: [],
        nabData: [],
        web: [],
        agent_name: 'Busca Básica',
        should_show_whatsapp_button: true,
      }

      console.log('DATABASE_SEARCH_RESULTS:', fallbackResults)

      setResults(fallbackResults)
      toast({
        title: 'Erro de Busca',
        description: err?.message || 'Ocorreu um erro ao consultar nossa base de dados.',
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
