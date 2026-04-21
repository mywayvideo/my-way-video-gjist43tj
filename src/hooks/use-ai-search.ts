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
      console.log('SEARCH_PARAMS:', settings?.ignore_stock_count, cleanQuery)

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

      // Generic Semantic Search Logic across all categories
      let genericQ = supabase.from('products').select('*').eq('is_discontinued', false)
      if (!settings?.ignore_stock_count) {
        genericQ = genericQ.gt('stock', 0)
      }

      const terms = cleanQuery.split(/\s+/).filter((t) => t.length > 1)
      if (terms.length > 0) {
        terms.forEach((t) => {
          genericQ = genericQ.or(
            `name.ilike.%${t}%,sku.ilike.%${t}%,category.ilike.%${t}%,description.ilike.%${t}%`,
          )
        })
      } else {
        genericQ = genericQ.or(
          `name.ilike.%${cleanQuery}%,sku.ilike.%${cleanQuery}%,category.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`,
        )
      }

      const { data: genericProducts } = await genericQ.limit(20)
      if (genericProducts && genericProducts.length > 0) {
        products = [...products, ...genericProducts].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        )
      }

      // Parallel Intelligence Search for all queries
      let nabQ = supabase.from('nab_market').select('*')
      let intelQ = supabase.from('market_intelligence').select('*')

      if (terms.length > 0) {
        terms.forEach((t) => {
          nabQ = nabQ.or(`title.ilike.%${t}%,content.ilike.%${t}%`)
          intelQ = intelQ.or(`title.ilike.%${t}%,raw_content.ilike.%${t}%`)
        })
      } else {
        nabQ = nabQ.or(`title.ilike.%${cleanQuery}%,content.ilike.%${cleanQuery}%`)
        intelQ = intelQ.or(`title.ilike.%${cleanQuery}%,raw_content.ilike.%${cleanQuery}%`)
      }

      const [{ data: fuzzyNab }, { data: fuzzyIntel }] = await Promise.all([
        nabQ.limit(15),
        intelQ.limit(15),
      ])

      if (fuzzyNab && fuzzyNab.length > 0) {
        nab = [...nab, ...fuzzyNab].filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
      }
      if (fuzzyIntel && fuzzyIntel.length > 0) {
        cache = [...cache, ...fuzzyIntel].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        )
      }

      // Augment products with full_specs if not present
      if (products.length > 0 && !products[0].full_specs && !products[0].technical_info) {
        const productIds = products.map((p: any) => p.id)
        const { data: fullProducts } = await supabase
          .from('products')
          .select('*')
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
        const { data: fullNab } = await supabase.from('nab_market').select('*').in('id', nabIds)
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
    console.log('IGNORE_STOCK_SETTING:', settings?.ignore_stock_count)
    if (!settings?.ignore_stock_count) {
      finalProducts = finalProducts.filter((p: any) => p.stock && p.stock > 0)
    }

    const priceThreshold = settings?.price_threshold_usd || 5000
    finalProducts = finalProducts.map((p: any) => ({
      ...p,
      is_expensive: p.price_usd > priceThreshold,
    }))

    const finalResultData = {
      stock: finalProducts,
      products: finalProducts,
      intel: cache,
      nabData: nab,
      web: [],
      settings: settings || {},
      isNewlyCached: false,
    }

    console.log('RAW_DB_RESULTS:', finalResultData)
    console.log(
      'INTELLIGENCE_FOUND:',
      finalResultData.nabData.length + finalResultData.intel.length,
    )

    return finalResultData
  }

  const search = async (rawQuery: string, history: any[] = []) => {
    const cleanQuery = rawQuery.trim()
    if (!cleanQuery) return

    console.log('CURRENT_TURN_SEARCH:', cleanQuery)
    console.log('NEW SEARCH FOR:', cleanQuery)
    setIsLoading(true)
    setResults(null) // Explicitly clear the previous results state to avoid data overlap
    accumulatedContext.current = { products: [], intel: [], nabData: [] }

    try {
      const activeAgent = await getActiveAgent()
      const unifiedData = await fetchUnifiedData(cleanQuery)

      // Accumulate context
      const newProducts = unifiedData.stock || []
      const newIntel = unifiedData.intel || []
      const newNab = unifiedData.nabData || []

      console.log('NEW RESULTS:', newProducts.length)

      accumulatedContext.current = {
        products: newProducts,
        intel: newIntel,
        nabData: newNab,
      }

      const currentUnifiedData = {
        ...unifiedData,
        stock: newProducts,
        products: newProducts,
        intel: newIntel,
        nabData: newNab,
      }

      let finalMessage = ''
      let finalConfidence = 'high'
      let finalProducts = currentUnifiedData.products
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
          stock: currentUnifiedData.stock,
          intel: currentUnifiedData.intel,
          nab_data: currentUnifiedData.nabData,
        })
        console.log('KNOWLEDGE_BASE_SENT_TO_AI:', contextString)
        const aiResponse = await generateExpertResponse(
          cleanQuery,
          { ...currentUnifiedData, stringifiedContext: contextString, history },
          activeAgent.id,
        )
        finalMessage = aiResponse.content
        finalConfidence = aiResponse.confidence_level || 'high'
        if (aiResponse.products && aiResponse.products.length > 0) {
          finalProducts = aiResponse.products
        }
        shouldShowWhatsapp = newProducts.length === 0
      }

      const combinedResults = {
        message: finalMessage,
        content: finalMessage,
        confidence_level: finalConfidence,
        stock: currentUnifiedData.stock,
        products: finalProducts,
        intel: currentUnifiedData.intel,
        nabData: currentUnifiedData.nabData,
        web: currentUnifiedData.web,
        settings: currentUnifiedData.settings,
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
        should_show_whatsapp_button: shouldShowWhatsapp,
      }

      console.log('SEARCH_RESULTS:', combinedResults)
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

      console.log('SEARCH_RESULTS:', fallbackResults)

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
