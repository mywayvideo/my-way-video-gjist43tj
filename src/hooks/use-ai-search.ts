import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateExpertResponse, getAISettings } from '@/services/intelligence'

const STOP_WORDS = new Set([
  'que',
  'qual',
  'como',
  'para',
  'por',
  'com',
  'uma',
  'um',
  'tem',
  'temos',
  'voces',
  'voce',
  'mostrar',
  'mostre',
  'quero',
  'gostaria',
  'saber',
  'preco',
  'valor',
  'sobre',
  'esse',
  'essa',
  'este',
  'esta',
  'aqui',
  'ali',
  'camera',
  'lente',
  'cabo',
  'modelo',
  'marca',
  'the',
  'what',
  'who',
  'how',
  'why',
  'can',
  'you',
  'show',
  'tell',
  'about',
  'price',
  'cost',
  'favor',
  'poderia',
  'quais',
])

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
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const ignoreStockCount =
      aiSettingsData?.ignore_stock_count ?? settings?.ignore_stock_count ?? true

    let products: any[] = []
    let cache: any[] = []
    let nab: any[] = []

    try {
      const rawSql = settings?.search_algorithm_sql || ''
      let sqlString = rawSql.trim()

      if (!sqlString) {
        sqlString = `SELECT * FROM products WHERE (name ILIKE '%$1%' OR sku ILIKE '%$1%' OR description ILIKE '%$1%') ORDER BY price_usd DESC, stock DESC LIMIT 20;`
      }

      // 1. Extract all words from the query that are NOT in the 'stopWords' list.
      // 2. Do NOT filter out words just because they lack numbers.
      const allWords = cleanQuery
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)

      // 3. Create a unified 'searchKeywords' array containing all relevant terms
      const searchKeywords = allWords.filter((w) => !STOP_WORDS.has(w.toLowerCase()))

      // 4. Ensure the longest and most specific terms are prioritized
      const sortedSearchWords = [...searchKeywords].sort((a, b) => b.length - a.length)

      const topKeywords = sortedSearchWords.slice(0, 3)

      // To treat the search as a specific entity, use the original keywords sequence or the most specific term
      const exactPhrase = searchKeywords.join(' ')
      const optimizedSearchTerm = exactPhrase || cleanQuery

      const executedSql = sqlString.replace(/\$1/g, optimizedSearchTerm)
      console.log('SQL_SEARCH_SOVEREIGNTY_EXECUTED:', executedSql)
      console.log('SEARCH_STATE:', { term: optimizedSearchTerm, ignoreStock: ignoreStockCount })

      // 1. Busca Unificada Padrão (Entidade Única / Frase Exata)
      const { data: searchData, error: searchError } = await supabase.rpc('unified_search', {
        search_term: optimizedSearchTerm,
      })

      if (searchError) {
        console.error('Error calling unified_search:', searchError)
      } else if (searchData) {
        const responseObj = searchData as any
        products = responseObj.stock || []
        cache = responseObj.intel || []
        nab = responseObj.nab_data || []
      }

      // Se a frase exata não retornar produtos, fazemos fallback com o termo mais específico
      if (
        products.length === 0 &&
        topKeywords.length > 0 &&
        topKeywords[0] !== optimizedSearchTerm
      ) {
        const { data: fallbackData } = await supabase.rpc('unified_search', {
          search_term: topKeywords[0],
        })
        if (fallbackData) {
          const fallbackObj = fallbackData as any
          products = fallbackObj.stock || []
          if (cache.length === 0) cache = fallbackObj.intel || []
          if (nab.length === 0) nab = fallbackObj.nab_data || []
        }
      }

      // 2. Escaneamento Prévio do Prompt (Garantir resultados para as palavras-chave)
      if (searchKeywords.length > 0) {
        let kwProducts: any[] = []

        // Attempt an AND condition for high precision if there are multiple keywords
        if (searchKeywords.length > 1) {
          let query = supabase.from('products').select('*').eq('is_discontinued', false).limit(10)
          searchKeywords.forEach((kw) => {
            query = query.ilike('name', `%${kw}%`)
          })
          const { data: preciseProducts } = await query
          if (preciseProducts && preciseProducts.length > 0) {
            kwProducts = preciseProducts
          }
        }

        // Fallback to OR conditions for the top terms to avoid missing products completely
        if (kwProducts.length === 0) {
          const orConditions = topKeywords
            .map((kw) => `name.ilike.%${kw}%,sku.ilike.%${kw}%`)
            .join(',')
          const { data: looseProducts } = await supabase
            .from('products')
            .select('*')
            .or(orConditions)
            .eq('is_discontinued', false)
            .limit(30)
          if (looseProducts) {
            kwProducts = looseProducts
          }
        }

        if (kwProducts && kwProducts.length > 0) {
          const existingIds = new Set(products.map((p) => p.id))
          kwProducts.forEach((p) => {
            if (!existingIds.has(p.id)) {
              products.push(p)
              existingIds.add(p.id)
            }
          })
        }
      }

      // Augment products with full_specs if not present
      if (products.length > 0) {
        const productIdsToFetch = products
          .filter((p) => !p.full_specs && !p.technical_info)
          .map((p) => p.id)
        if (productIdsToFetch.length > 0) {
          const { data: fullProducts } = await supabase
            .from('products')
            .select('*')
            .in('id', productIdsToFetch)
          if (fullProducts) {
            products = products.map((p: any) => {
              const fullP = fullProducts.find((fp) => fp.id === p.id)
              return fullP ? { ...p, ...fullP, full_specs: fullP.technical_info } : p
            })
          }
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
          .slice(0, 10)
      } else if (newProducts.length === 0) {
        combinedProducts = accumulatedContext.current.products
      }

      const sortedCombinedProducts = combinedProducts.sort((a, b) => {
        if (a.sku?.toLowerCase() === cleanQuery.toLowerCase()) return -1
        if (b.sku?.toLowerCase() === cleanQuery.toLowerCase()) return 1
        return 0
      })

      accumulatedContext.current = {
        products: sortedCombinedProducts,
        intel: newIntel,
        nabData: newNab,
      }

      const currentUnifiedData = {
        ...unifiedData,
        stock: sortedCombinedProducts,
        products: sortedCombinedProducts,
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

        // Busca de "Última Hora" (Pós-Resposta)
        let aiReturnedProducts = aiResponse.products || []
        const referencedIds = aiResponse.referenced_internal_products || []

        // Varredura de emergência: Extrair UUIDs do texto da mensagem da IA, caso ela não tenha preenchido o array corretamente
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
        const textUuids = finalMessage.match(uuidRegex) || []

        // Varredura de SKUs mencionados no texto (cruzando com os produtos que já estão no contexto)
        const stockSkus = currentUnifiedData.stock.map((p: any) => p.sku).filter(Boolean)
        const mentionedSkus = stockSkus.filter((sku: string) => finalMessage.includes(sku))

        // Varredura de SKUs e UUIDs mencionados DIRETAMENTE NO PROMPT DO USUÁRIO
        const promptUuids = cleanQuery.match(uuidRegex) || []
        const promptMentionedSkus = stockSkus.filter((sku: string) =>
          cleanQuery.toLowerCase().includes(sku.toLowerCase()),
        )

        // Extração de possíveis palavras-chave específicas do prompt
        const potentialPromptSkus = cleanQuery
          .replace(/[^\w\s-]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()))

        // Adiciona os produtos que encontramos no passo "Escaneamento Prévio do Prompt"
        // para garantir que eles tenham precedência se houver match forte.
        const explicitSearchProducts = currentUnifiedData.stock.filter(
          (p: any) =>
            potentialPromptSkus.some(
              (sku) =>
                p.sku?.toLowerCase().includes(sku.toLowerCase()) ||
                p.name?.toLowerCase().includes(sku.toLowerCase()),
            ) || promptMentionedSkus.includes(p.sku),
        )

        let allIdsOrObjects = [
          ...explicitSearchProducts,
          ...promptUuids,
          ...promptMentionedSkus,
          ...potentialPromptSkus,
          ...aiReturnedProducts,
          ...referencedIds,
          ...textUuids,
          ...mentionedSkus,
        ]
        const uniqueItems: any[] = []
        const seenIds = new Set()

        for (const item of allIdsOrObjects) {
          const id = typeof item === 'object' && item !== null ? item.id : item
          if (id && !seenIds.has(id)) {
            seenIds.add(id)
            uniqueItems.push(item)
          }
        }

        if (uniqueItems.length > 0) {
          const hydrated = uniqueItems.map((item: any) => {
            if (typeof item === 'object' && item !== null && item.id) return item
            const found = currentUnifiedData.stock.find(
              (p: any) =>
                p.id === item ||
                (typeof item === 'string' && p.sku?.toLowerCase() === item.toLowerCase()),
            )
            return found || item
          })

          // Separa IDs válidos (UUID) de possíveis SKUs informados incorretamente pela IA
          const missingIds = hydrated.filter(
            (p: any) => typeof p === 'string' && /^[0-9a-fA-F]{8}-/.test(p),
          )
          const missingSkus = hydrated.filter(
            (p: any) => typeof p === 'string' && !/^[0-9a-fA-F]{8}-/.test(p),
          )

          let fetchedMissing: any[] = []

          if (missingIds.length > 0) {
            const { data } = await supabase.from('products').select('*').in('id', missingIds)
            if (data) fetchedMissing = [...fetchedMissing, ...data]
          }

          if (missingSkus.length > 0) {
            const orConditions = missingSkus
              .map((s: string) => `sku.ilike.%${s}%,name.ilike.%${s}%`)
              .join(',')
            const { data } = await supabase
              .from('products')
              .select('*')
              .or(orConditions)
              .eq('is_discontinued', false)
              .limit(10)
            if (data) fetchedMissing = [...fetchedMissing, ...data]
          }

          aiReturnedProducts = hydrated
            .map((p: any) => {
              if (typeof p === 'string') {
                return (
                  fetchedMissing.find(
                    (m) =>
                      m.id === p ||
                      m.sku?.toLowerCase().includes(p.toLowerCase()) ||
                      m.name?.toLowerCase().includes(p.toLowerCase()),
                  ) || null
                )
              }
              return p
            })
            .filter(Boolean)
        }

        // Render ALL products returned explicitly by AI, but merged with explicit prompt matches
        let mergedFinalProducts = [...aiReturnedProducts]

        // Also ensure any product explicitly searched in the prompt is included at the top
        if (explicitSearchProducts && explicitSearchProducts.length > 0) {
          const existingIds = new Set(mergedFinalProducts.map((p: any) => p.id))

          explicitSearchProducts.forEach((p: any) => {
            if (!existingIds.has(p.id)) {
              mergedFinalProducts.unshift(p) // Add to the top
              existingIds.add(p.id)
            }
          })
        }

        if (mergedFinalProducts.length > 0) {
          finalProducts = mergedFinalProducts
        } else if (newProducts.length > 0) {
          finalProducts = newProducts
        } else {
          finalProducts = []
        }

        shouldShowWhatsapp = finalProducts.length === 0
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
