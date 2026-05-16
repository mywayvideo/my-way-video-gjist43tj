import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent } from '@/services/intelligence'
import { useAuth } from '@/hooks/use-auth'
export function useUnifiedSearch() {
  const sessionIdRef = useRef<string | null>(null)
  const lastRequestIdRef = useRef(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null) // ← INSTRUÇÃO 23
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null) // ← INSTRUÇÃO 24
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()
  const auth = useAuth() as any
  const user = auth.user
  const isAdmin =
    auth.isAdmin ||
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin' ||
    false
  const userName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Usuário'
  const clearResults = () => {
    setResults(null)
  }
  const calculateFinalPrice = (p: any) => {
    let finalUsdPrice = Number(p.price_usd || p.price_usa || 0)
    if (Number(p.price_usa_rebate) > 0) {
      if (!p.date_rebate) {
        finalUsdPrice = Number(p.price_usa_rebate)
      } else {
        const rebateDate = new Date(p.date_rebate)
        if (new Date() <= rebateDate) finalUsdPrice = Number(p.price_usa_rebate)
      }
    }
    return finalUsdPrice
  }
  const search = async (
    rawQuery: string,
    extraContext: { productName?: string; technicalInfo?: string; currentProductId?: string } = {},
  ) => {
    const requestId = Date.now()
    lastRequestIdRef.current = requestId
    const cleanQuery = rawQuery.trim()
    if (!cleanQuery) return
    setResults(null) // ← INSTRUÇÃO 19
    console.log('NEW SEARCH FOR:', cleanQuery)
    // 1. Definição das Fases de Elite (Soberania MY WAY)
    const phases = [
      'Iniciando busca profunda MY WAY... Analisando termo técnico.',
      'Tier 1: Consultando base de dados e estoque imediato...',
      'Tier 2: Refinando busca por modelos e variações técnicas...',
      'Tier 3: Validando preços e SKUs oficiais MY WAY...',
      'Tier 4: Sintetizando inteligência de mercado...',
    ]
    // 2. Estado Inicial Intermediário
    setResults({
      message: phases[0],
      content: phases[0],
      confidence_level: 'high',
      referenced_internal_products: [],
      should_show_whatsapp_button: false,
      is_intermediate: true,
    })
    setIsLoading(true)
    // 3. Batida do Coração (Heartbeat) - Sincronização de Visão
    let phaseIndex = 0
    heartbeatRef.current = setInterval(() => {
      setResults((prev: any) => {
        if (prev && prev.is_intermediate === false) {
          if (heartbeatRef.current) clearInterval(heartbeatRef.current)
          return prev
        }
        if (phaseIndex < phases.length - 1) {
          phaseIndex++
          return {
            ...prev,
            message: phases[phaseIndex],
            content: phases[phaseIndex],
            is_intermediate: true,
          }
        }
        return prev
      })
    }, 1000)
    try {
      if (!sessionIdRef.current) {
        sessionIdRef.current = `home_${crypto.randomUUID()}`
      }
      const sessionId = sessionIdRef.current
      let finalMessage = ''
      let finalProducts: any[] = []
      let shouldShowWhatsapp = false
      const activeAgent = await getActiveAgent()
      await new Promise((resolve) => setTimeout(resolve, 50))
      // Declaramos aiResponse aqui para garantir o escopo global na função search
      let aiResponse: any = null
      if (!activeAgent) {
        finalMessage = 'Nenhum agente de IA configurado.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Usando busca básica.',
        })
      } else {
        try {
          const { data: aiData, error: aiErrorReq } = await supabase.functions.invoke('ai-search', {
            body: {
              query: cleanQuery,
              session_id: sessionId,
              userName,
              productName: extraContext?.productName,
              technicalInfo: extraContext?.technicalInfo,
              currentProductId: extraContext?.currentProductId || null,
              isAdmin: !!isAdmin,
            },
          })
          if (aiErrorReq) throw aiErrorReq
          aiResponse = aiData
        } catch (aiError) {
          console.error('Error parsing AI response:', aiError)
          aiResponse = {
            message: 'Desculpe, ocorreu um erro ao processar a resposta da IA.',
            confidence_level: 'low',
            referenced_internal_products: [],
          }
        }
      }
      if (!aiResponse) {
        aiResponse = { message: finalMessage }
      }
      // 3. Processamento de Dados (Fora de qualquer IF restritivo)
      finalMessage =
        typeof aiResponse?.message === 'string' && aiResponse.message.trim() !== ''
          ? aiResponse.message
          : typeof aiResponse?.content === 'string' && aiResponse.content.trim() !== ''
            ? aiResponse.content
            : finalMessage || 'Não foi possível gerar uma resposta no momento.'
      finalMessage = finalMessage.trim()
      // correção
      let aiStock: any[] = []
      if (Array.isArray(aiResponse?.stock)) {
        aiStock = aiResponse.stock.filter((item: any) => item && typeof item === 'object')
      }
      if (aiStock.length > 0) {
        finalProducts = aiStock.map((p: any) => ({
          ...p,
          price_usa: p.price_usd !== undefined ? Number(p.price_usd) : calculateFinalPrice(p),
          price_usd: p.price_usd !== undefined ? Number(p.price_usd) : calculateFinalPrice(p),
          price_brl: Number(p.price_brl || 0),
          stock: Number(p.stock || 0),
        }))
      }
      finalProducts = finalProducts.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
      shouldShowWhatsapp = !!aiResponse?.should_show_whatsapp_button
      // 2. Enriquecer produtos com os produtos referenciados pela IA
      let enrichedProducts = [...finalProducts]

      if (
        Array.isArray(aiResponse?.referenced_internal_products) &&
        aiResponse.referenced_internal_products.length > 0
      ) {
        const { data: related } = await supabase
          .from('products')
          .select('*')
          .in('id', aiResponse.referenced_internal_products)

        if (related && related.length > 0) {
          enrichedProducts = [...enrichedProducts, ...related]
        }
      }

      // 4. Montagem Final (Garante que settings e message existam)
      const combinedResults = {
        message: finalMessage,
        content: finalMessage,
        confidence_level: aiResponse?.confidence_level || 'high',
        stock: finalProducts,
        products: enrichedProducts,
        referenced_internal_products: Array.isArray(aiResponse?.referenced_internal_products)
          ? aiResponse.referenced_internal_products
          : [],
        settings: aiResponse?.settings || {},
        agent_name: activeAgent?.provider_name || 'Especialista MY WAY',
        should_show_whatsapp_button: shouldShowWhatsapp,
        is_intermediate: false,
        intel: aiResponse?.intel || [],
        nabData: aiResponse?.nab_data || [],
      }
      console.log('SEARCH_RESULTS:', combinedResults)
      // Guardião contra respostas atrasadas
      if (lastRequestIdRef.current !== requestId) {
        console.log('Resposta ignorada por ser de uma busca antiga.')
        return
      }
      // Cancelamento de timeouts antigos
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
      // Entrega final dos resultados
      setResults(combinedResults)
      // Scroll seguro com timeout
      scrollTimeoutRef.current = setTimeout(() => {
        const container = document.querySelector('.ai-response-container') as HTMLElement | null
        if (container) {
          container.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
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
      setResults(fallbackResults)

      // Cancelamento de timeouts antigos
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }

      // Scroll seguro com timeout
      scrollTimeoutRef.current = setTimeout(() => {
        const container = document.querySelector('.ai-response-container') as HTMLElement | null
        if (container) {
          container.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)

      toast({
        title: 'Erro de Busca',
        description: err?.message || 'Ocorreu um erro ao consultar nossa base de dados.',
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
  }
  return { search, isLoading, results, clearResults }
}
export const useAiSearch = useUnifiedSearch
