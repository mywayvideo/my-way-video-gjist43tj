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

    const { data: aiSettingsData } = await supabase
      .from('ai_settings')
      .select('ignore_stock_count')
      .limit(1)
      .maybeSingle()

    const ignoreStockCount =
      aiSettingsData?.ignore_stock_count ?? settings?.ignore_stock_count ?? false

    let products: any[] = []
    let cache: any[] = []
    let nab: any[] = []

    try {
      const rawSql = settings?.search_algorithm_sql || ''
      let sqlString = rawSql.trim()

      if (!sqlString) {
        sqlString = `SELECT * FROM products WHERE (name ILIKE '%$1%' OR sku ILIKE '%$1%' OR description ILIKE '%$1%') ORDER BY price_usd DESC, stock DESC LIMIT 20;`
      }

      const executedSql = sqlString.replace(/\$1/g, cleanQuery)
      console.log('SQL_SEARCH_SOVEREIGNTY_EXECUTED:', executedSql)
      console.log('SEARCH_STATE:', { term: cleanQuery, ignoreStock: ignoreStockCount })

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

      // Manufacturer matching to simulate JOIN in OR
      const { data: allMfgs } = await supabase.from('manufacturers').select('id, name')

      // Generic Semantic Search Logic across all categories and manufacturers
      let genericQ = supabase.from('products').select('*').eq('is_discontinued', false)
      if (!ignoreStockCount) {
        genericQ = genericQ.gt('stock', 0)
      }

      const stopWords = [
        'and',
        'vs',
        'e',
        'ou',
        'com',
        'versus',
        'comparar',
        'compare',
        'entre',
        'qual',
        'melhor',
        'diferença',
        'indicações',
        'indicacoes',
        'recomendacoes',
        'recomendações',
        'para',
        'de',
      ]
      const terms = cleanQuery
        .split(/\s+/)
        .filter((t) => t.length > 2 && !stopWords.includes(t.toLowerCase()))

      const buildOrQuery = (term: string) => {
        const matchedMfgs =
          allMfgs
            ?.filter((m) => m.name.toLowerCase().includes(term.toLowerCase()))
            .map((m) => m.id) || []
        let orStr = `name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`
        if (matchedMfgs.length > 0) {
          orStr += `,manufacturer_id.in.(${matchedMfgs.join(',')})`
        }
        return orStr
      }

      let orStr = ''
      if (terms.length > 0) {
        orStr = terms.map((t) => buildOrQuery(t)).join(',')
      } else {
        orStr = buildOrQuery(cleanQuery)
      }

      if (orStr) {
        genericQ = genericQ.or(orStr)
      }

      const { data: genericProducts } = await genericQ
        .order('price_usd', { ascending: false })
        .order('stock', { ascending: false })
        .limit(20)

      if (genericProducts && genericProducts.length > 0) {
        products = [...products, ...genericProducts].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        )
      }

      // Parallel Intelligence Search for all queries
      let nabQ = supabase.from('nab_market').select('*')
      let intelQ = supabase.from('market_intelligence').select('*').eq('status', 'published')

      if (terms.length > 0) {
        const nabOrStr = terms.map((t) => `title.ilike.%${t}%,content.ilike.%${t}%`).join(',')
        const intelOrStr = terms
          .map((t) => `title.ilike.%${t}%,ai_summary.ilike.%${t}%,raw_content.ilike.%${t}%`)
          .join(',')
        nabQ = nabQ.or(nabOrStr)
        intelQ = intelQ.or(intelOrStr)
      } else {
        nabQ = nabQ.or(`title.ilike.%${cleanQuery}%,content.ilike.%${cleanQuery}%`)
        intelQ = intelQ.or(
          `title.ilike.%${cleanQuery}%,ai_summary.ilike.%${cleanQuery}%,raw_content.ilike.%${cleanQuery}%`,
        )
      }

      const [{ data: fuzzyNab }, { data: fuzzyIntel }] = await Promise.all([
        nabQ.limit(50),
        intelQ.limit(50),
      ])

      const scoreItem = (item: any) => {
        let score = 0
        const tLower = (item.title || '').toLowerCase()
        const sLower = (item.ai_summary || '').toLowerCase()
        const qLower = cleanQuery.toLowerCase()
        if (tLower.includes(qLower)) score += 10
        if (sLower.includes(qLower)) score += 5
        return score
      }

      if (fuzzyNab && fuzzyNab.length > 0) {
        const sortedNab = fuzzyNab.sort((a, b) => scoreItem(b) - scoreItem(a))
        nab = [...nab, ...sortedNab].filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
      }
      if (fuzzyIntel && fuzzyIntel.length > 0) {
        const sortedIntel = fuzzyIntel.sort((a, b) => scoreItem(b) - scoreItem(a))
        cache = [...cache, ...sortedIntel].filter(
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
    console.log('IGNORE_STOCK_SETTING:', ignoreStockCount)
    if (!ignoreStockCount) {
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

    console.log(
      'MATCHED_PRODUCTS:',
      finalResultData.stock.map((p: any) => `${p.name} - $${p.price_usd}`),
    )

    console.log('RAW_DB_RESULTS:', finalResultData)
    console.log(
      'INTELLIGENCE_FOUND:',
      finalResultData.nabData.length + finalResultData.intel.length,
    )
    console.log('NAB_DATA_FETCHED:', finalResultData.nabData)
    console.log('INTEL_DATA_FOUND:', finalResultData.intel)

    return finalResultData
  }

  const search = async (rawQuery: string, history: any[] = []) => {
    const cleanQuery = rawQuery.trim()
    if (!cleanQuery) return

    console.log('CURRENT_TURN_SEARCH:', cleanQuery)
    console.log('NEW SEARCH FOR:', cleanQuery)
    setIsLoading(true)
    setResults(null) // Explicitly clear the previous results state to avoid data overlap

    try {
      const activeAgent = await getActiveAgent()
      const unifiedData = await fetchUnifiedData(cleanQuery)

      // Accumulate context
      const newProducts = unifiedData.stock || []
      const newIntel = unifiedData.intel || []
      const newNab = unifiedData.nabData || []

      console.log('NEW RESULTS:', newProducts.length)

      const isComparison =
        cleanQuery.toLowerCase().includes('vs') ||
        cleanQuery.toLowerCase().includes('versus') ||
        cleanQuery.toLowerCase().includes('comparar') ||
        cleanQuery.toLowerCase().includes('compare') ||
        cleanQuery.toLowerCase().includes('diferença')

      let combinedProducts = newProducts
      if (isComparison && accumulatedContext.current.products.length > 0) {
        combinedProducts = [...accumulatedContext.current.products, ...newProducts].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        )
      } else if (!isComparison && newProducts.length > 0) {
        combinedProducts = [...newProducts, ...accumulatedContext.current.products]
          .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
          .slice(0, 6)
      } else if (newProducts.length === 0) {
        combinedProducts = accumulatedContext.current.products
      }

      accumulatedContext.current = {
        products: combinedProducts,
        intel: newIntel,
        nabData: newNab,
      }

      const currentUnifiedData = {
        ...unifiedData,
        stock: combinedProducts,
        products: combinedProducts,
        intel: newIntel,
        nabData: newNab,
      }

      // Emit intermediate results so UI can render loading state
      const intermediateResults = {
        message: 'Analisando resultados...',
        content: 'Analisando resultados...',
        confidence_level: 'high',
        stock: currentUnifiedData.stock,
        products: [], // Do not render products until AI confirms relevance
        intel: currentUnifiedData.intel,
        nabData: currentUnifiedData.nabData,
        web: currentUnifiedData.web,
        settings: currentUnifiedData.settings,
        agent_name: 'Especialista My Way',
        should_show_whatsapp_button: false,
        is_intermediate: true,
      }
      setResults(intermediateResults)

      let finalMessage = ''
      let finalConfidence = 'high'
      let finalProducts = currentUnifiedData.products
      let shouldShowWhatsapp = false

      if (!activeAgent) {
        finalMessage = 'Nenhum agente de IA configurado. Exibindo resultados da base unificada.'
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

        // Render ALL products returned explicitly by AI
        if (aiResponse.products && aiResponse.products.length > 0) {
          finalProducts = aiResponse.products
        } else if (newProducts.length > 0) {
          finalProducts = newProducts
        } else {
          finalProducts = []
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
        is_intermediate: false,
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
        is_intermediate: false,
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
