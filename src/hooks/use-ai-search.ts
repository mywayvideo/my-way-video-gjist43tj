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
        sqlString = `SELECT * FROM products WHERE (name ILIKE '%$1%' OR sku ILIKE '%$1%' OR description ILIKE '%$1%') ORDER BY manufacturer_id ASC, price_usd ASC LIMIT 20;`
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
      const specificModels = ['fx6', 'c400', 'fx3', 'pyxis']
      const hasSpecificModel = specificModels.some((model) =>
        cleanQuery.toLowerCase().includes(model),
      )

      const isCinemaQuery = ['cinema', 'filmagem', 'produção', 'producao', 'câmera', 'camera'].some(
        (kw) => cleanQuery.toLowerCase().includes(kw),
      )
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
      if (hasSpecificModel) {
        const modelsOrStr = specificModels
          .map((m) => `name.ilike.%${m}%,sku.ilike.%${m}%`)
          .join(',')
        if (terms.length > 0) {
          const combinedOrStr = terms.map((t) => buildOrQuery(t)).join(',')
          orStr = `${combinedOrStr},${modelsOrStr}`
        } else {
          orStr = modelsOrStr
        }
      } else if (isCinemaQuery) {
        let cinemaOrStr = `description.ilike.%Cinema%,name.ilike.%FX%,name.ilike.%EOS C%,name.ilike.%URSA%,name.ilike.%Pocket%`
        if (terms.length > 0) {
          const combinedOrStr = terms.map((t) => buildOrQuery(t)).join(',')
          orStr = `${combinedOrStr},${cinemaOrStr}`
        } else {
          orStr = cinemaOrStr
        }
      } else {
        if (terms.length > 0) {
          orStr = terms.map((t) => buildOrQuery(t)).join(',')
        } else {
          orStr = buildOrQuery(cleanQuery)
        }
      }

      genericQ = genericQ.or(orStr)

      const { data: genericProducts } = await genericQ
        .order('manufacturer_id', { ascending: true })
        .order('price_usd', { ascending: true })
        .limit(20)

      if (genericProducts && genericProducts.length > 0) {
        products = [...products, ...genericProducts].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        )
      }

      // Parallel Intelligence Search for all queries
      let nabQ = supabase.from('nab_market').select('*')
      let intelQ = supabase.from('market_intelligence').select('*').eq('status', 'published')

      // Targeted Intelligence Fetching: prevent data leak from other brands
      const knownBrands = [
        'blackmagic',
        'sony',
        'canon',
        'datavideo',
        'red',
        'arri',
        'dji',
        'panasonic',
        'aputure',
        'godox',
        'ptzoptics',
      ]
      const mentionedBrands = knownBrands.filter((b) => cleanQuery.toLowerCase().includes(b))

      if (mentionedBrands.length > 0) {
        // Enforce strict brand filtering
        const brandOrs = mentionedBrands
          .map((b) => `title.ilike.%${b}%,raw_content.ilike.%${b}%,ai_summary.ilike.%${b}%`)
          .join(',')
        intelQ = intelQ.or(brandOrs)
        const nabBrandOrs = mentionedBrands
          .map((b) => `title.ilike.%${b}%,content.ilike.%${b}%`)
          .join(',')
        nabQ = nabQ.or(nabBrandOrs)
      } else if (terms.length > 0) {
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

    const specificModels = ['fx6', 'c400', 'fx3', 'pyxis']
    const hasSpecificModel = specificModels.some((model) =>
      cleanQuery.toLowerCase().includes(model),
    )

    finalProducts = finalProducts.sort((a: any, b: any) => {
      if (hasSpecificModel) {
        const aMatch = specificModels.some(
          (m) =>
            (a.name || '').toLowerCase().includes(m) || (a.sku || '').toLowerCase().includes(m),
        )
        const bMatch = specificModels.some(
          (m) =>
            (b.name || '').toLowerCase().includes(m) || (b.sku || '').toLowerCase().includes(m),
        )
        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
      }

      const aMfg = a.manufacturer_id || ''
      const bMfg = b.manufacturer_id || ''
      if (aMfg < bMfg) return -1
      if (aMfg > bMfg) return 1

      const aPrice = a.price_usd || 0
      const bPrice = b.price_usd || 0
      return aPrice - bPrice
    })

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
        finalMessage =
          'Nenhum agente de IA configurado. Exibindo resultados da base unificada.\n\nTodos os serviços e produtos da My Way estão cobertos pela nossa garantia oficial Brasil/LATAM.'
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

        // Card Relevance Logic: Only render ProductCards explicitly mentioned/relevant to the turn
        if (aiResponse.products && aiResponse.products.length > 0) {
          finalProducts = aiResponse.products.sort((a: any, b: any) => {
            const aMfg = a.manufacturer_id || ''
            const bMfg = b.manufacturer_id || ''
            if (aMfg < bMfg) return -1
            if (aMfg > bMfg) return 1
            return (a.price_usd || 0) - (b.price_usd || 0)
          })
        } else if (newProducts.length > 0) {
          // If AI fails to return referenced_internal_products but we have strong generic matches, fallback to the top 3 matches
          finalProducts = newProducts
            .sort((a: any, b: any) => {
              const aMfg = a.manufacturer_id || ''
              const bMfg = b.manufacturer_id || ''
              if (aMfg < bMfg) return -1
              if (aMfg > bMfg) return 1
              return (a.price_usd || 0) - (b.price_usd || 0)
            })
            .slice(0, 3)
        } else {
          finalProducts = [] // Do not show random products
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
