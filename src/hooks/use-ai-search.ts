import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent } from '@/services/intelligence'
import { calculateFinalPrice } from '@/utils/pricing'

// =========================
// TIPAGEM ESTRITA (Resolve o debt de 'any')
// =========================

export interface SearchExtraContext {
  productName?: string
  technicalInfo?: string
  currentProductId?: string
}

export interface UnifiedSearchResult {
  message: string
  content: string
  confidence_level: 'high' | 'low'
  products: any[]
  stock: any[]
  referenced_internal_products: string[]
  settings: Record<string, any>
  agent_name: string
  should_show_whatsapp_button: boolean
  is_intermediate: boolean
  intel: any[]
  nabData: any[]
  web: any[]
}

export interface UseUnifiedSearchReturn {
  search: (
    rawQuery: string,
    extraContext?: SearchExtraContext,
  ) => Promise<UnifiedSearchResult | void>
  isLoading: boolean
  results: UnifiedSearchResult | null
  clearResults: () => void
}

// =========================
// HOOK
// =========================

export function useUnifiedSearch(): UseUnifiedSearchReturn {
  const sessionIdRef = useRef<string | null>(null)
  const lastRequestIdRef = useRef(0)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<UnifiedSearchResult | null>(null)
  const { toast } = useToast()

  // Cleanup completo no unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  const clearResults = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    setResults(null)
  }, [])

  // Grounding com suporte a AbortSignal
  const fetchProductDetails = async (productIds: string[], signal: AbortSignal): Promise<any[]> => {
    if (!productIds || productIds.length === 0) return []
    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, price_usa, price_brl, image_url, description, sku, category, price_usa_rebate, date_rebate',
        )
        .in('id', productIds)
        .abortSignal(signal)

      if (error) throw error
      return data || []
    } catch (error: any) {
      if (error.name === 'AbortError') return []
      console.error('[GROUNDING ERROR]', error)
      return []
    }
  }

  const search = useCallback(
    async (
      rawQuery: string,
      extraContext: SearchExtraContext = {},
    ): Promise<UnifiedSearchResult | void> => {
      // 1. Aborta requisição anterior fisicamente
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      const requestId = Date.now()
      lastRequestIdRef.current = requestId
      const cleanQuery = rawQuery.trim()
      if (!cleanQuery) return

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }

      setIsLoading(true)

      const phases = [
        'Iniciando busca profunda MY WAY... Analisando termo técnico.',
        'Tier 1: Consultando base de dados e estoque imediato...',
        'Tier 2: Refinando busca por modelos e variações técnicas...',
        'Tier 3: Validando preços e SKUs oficiais MY WAY...',
        'Tier 4: Sintetizando inteligência de mercado...',
      ]

      const intermediateState: UnifiedSearchResult = {
        message: phases[0],
        content: phases[0],
        confidence_level: 'high',
        referenced_internal_products: [],
        products: [],
        stock: [],
        intel: [],
        nabData: [],
        web: [],
        should_show_whatsapp_button: false,
        is_intermediate: true,
        settings: {},
        agent_name: 'Especialista MY WAY',
      }
      setResults(intermediateState)

      let phaseIndex = 0
      heartbeatRef.current = setInterval(() => {
        setResults((prev) => {
          if (!prev || prev.is_intermediate === false) {
            if (heartbeatRef.current) {
              clearInterval(heartbeatRef.current)
              heartbeatRef.current = null
            }
            return prev
          }
          if (phaseIndex < phases.length - 1) {
            phaseIndex++
            return {
              ...prev,
              message: phases[phaseIndex],
              content: phases[phaseIndex],
            }
          }
          return prev
        })
      }, 1000)

      try {
        if (!sessionIdRef.current) {
          sessionIdRef.current = `home_${crypto.randomUUID()}`
        }

        const activeAgent = await getActiveAgent()
        let aiResponse: any = null

        if (!activeAgent) {
          toast({
            title: 'Aviso',
            description: 'Nenhum agente configurado. Usando busca básica.',
          })
          aiResponse = {
            message: 'Nenhum agente de IA configurado no momento.',
            confidence_level: 'low',
            referenced_internal_products: [],
          }
        } else {
          // Chamada com AbortController (fallback via headers se a lib não suportar signal)
          const { data, error } = await supabase.functions.invoke('execute_ai_search_v2', {
            body: {
              query: cleanQuery,
              session_id: sessionIdRef.current,
              currentProductId: extraContext?.currentProductId || null,
            },
            // @ts-expect-error - O Supabase client pode não expor signal na tipagem, mas aceita em runtime
            signal,
            headers: {
              'x-request-id': requestId.toString(),
            },
          })

          if (error) throw error
          aiResponse = data
        }

        const finalMessage = (
          aiResponse?.message ||
          aiResponse?.content ||
          'Não foi possível gerar uma resposta.'
        ).trim()

        let finalProducts: any[] = []
        if (
          Array.isArray(aiResponse?.referenced_internal_products) &&
          aiResponse.referenced_internal_products.length > 0
        ) {
          const details = await fetchProductDetails(aiResponse.referenced_internal_products, signal)
          finalProducts = details.map((p) => {
            const finalPrice = calculateFinalPrice(p)
            return {
              ...p,
              price_usa: finalPrice,
              price_usd: finalPrice,
              price_brl: Number(p.price_brl || 0),
              stock: Number(p.stock || 0),
            }
          })
        }

        // Deduplicação + Filtro de Auto-Referência
        let enrichedProducts = Array.from(new Map(finalProducts.map((p) => [p.id, p])).values())

        if (extraContext?.currentProductId) {
          enrichedProducts = enrichedProducts.filter((p) => p.id !== extraContext.currentProductId)
        }

        const combinedResults: UnifiedSearchResult = {
          message: finalMessage,
          content: finalMessage,
          confidence_level: aiResponse?.confidence_level || 'high',
          products: enrichedProducts,
          stock: enrichedProducts,
          referenced_internal_products: aiResponse?.referenced_internal_products || [],
          settings: aiResponse?.settings || {},
          agent_name: activeAgent?.provider_name || 'Especialista MY WAY',
          should_show_whatsapp_button: !!aiResponse?.should_show_whatsapp_button,
          is_intermediate: false,
          intel: aiResponse?.intel || [],
          nabData: aiResponse?.nab_data || [],
          web: aiResponse?.web || [],
        }

        // Guardião duplo: abort + request ID
        if (lastRequestIdRef.current !== requestId || signal.aborted) return

        setResults(combinedResults)

        // Scroll (UI concern) - mantido por compatibilidade, mas idealmente sairia do hook
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
          const container = document.querySelector('.ai-response-container') as HTMLElement | null
          if (container) container.scrollIntoView({ behavior: 'smooth' })
        }, 100)

        return combinedResults
      } catch (err: any) {
        if (err.name === 'AbortError' || signal.aborted) {
          console.log('[useUnifiedSearch] Request abortada silenciosamente.')
          return
        }

        console.error('[useUnifiedSearch] error:', err)
        const fallbackResults: UnifiedSearchResult = {
          message:
            err?.status === 429
              ? 'Muitas requisições. Por favor, aguarde um minuto.'
              : 'Ocorreu um erro ao consultar nossos sistemas. Tente novamente.',
          content: 'Erro na consulta.',
          confidence_level: 'low',
          products: [],
          stock: [],
          intel: [],
          nabData: [],
          web: [],
          agent_name: 'Busca Básica',
          should_show_whatsapp_button: true,
          is_intermediate: false,
          settings: {},
        }
        setResults(fallbackResults)
        toast({
          title: 'Erro de Busca',
          description: err?.message || 'Erro ao acessar o motor de IA.',
          variant: 'destructive',
        })
        return fallbackResults
      } finally {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }
        setIsLoading(false)
      }
    },
    [toast],
  )

  return { search, isLoading, results, clearResults }
}

export const useAiSearch = useUnifiedSearch

// =========================
// UTILITÁRIO EXTRAÍDO: src/utils/pricing.ts
// =========================
// Coloque este conteúdo em um arquivo separado: src/utils/pricing.ts
// export const calculateFinalPrice = (p: any): number => {
//   let finalUsdPrice = Number(p.price_usd || p.price_usa || 0)
//   if (Number(p.price_usa_rebate) > 0) {
//     if (!p.date_rebate) {
//       finalUsdPrice = Number(p.price_usa_rebate)
//     } else {
//       const rebateDate = new Date(p.date_rebate)
//       if (new Date() <= rebateDate) finalUsdPrice = Number(p.price_usa_rebate)
//     }
//   }
//   return finalUsdPrice
// }
