import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent } from '@/services/intelligence'
import { useAuth } from '@/hooks/use-auth'

export function useUnifiedSearch() {
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
    history: any[] = [],
    extraContext?: { productName?: string; technicalInfo?: string; currentProductId?: string },
  ) => {
    const cleanQuery = rawQuery.trim()
    if (!cleanQuery) return

    console.log('NEW SEARCH FOR:', cleanQuery)

    const intermediateResults = {
      message: 'Iniciando busca profunda MY WAY... Analisando modelos e disponibilidade...',
      confidence_level: 'high',
      referenced_internal_products: [],
      should_show_whatsapp_button: false,
      is_intermediate: true,
    }
    setResults(intermediateResults)
    setIsLoading(true)

    const phases = [
      'Iniciando busca profunda MY WAY... Analisando modelos e disponibilidade...',
      'Tier 1: Analisando termo completo em nossa base...',
      'Tier 2-4: Refinando por modelo e variações técnicas...',
      'Soberania de Dados: Sintetizando proposta técnica MY WAY...',
    ]

    let phaseIndex = 0
    const heartbeatInterval = setInterval(() => {
      phaseIndex = Math.min(phaseIndex + 1, phases.length - 1)
      setResults((prev: any) => {
        if (!prev || !prev.is_intermediate) {
          clearInterval(heartbeatInterval)
          return prev
        }
        return { ...prev, message: phases[phaseIndex], content: phases[phaseIndex] }
      })
    }, 2500)

    try {
      let sessionId = sessionStorage.getItem('ai_chat_session_id')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        sessionStorage.setItem('ai_chat_session_id', sessionId)
      }

      let chatHistory: any[] = []
      let userId = user?.id || null
      let userName =
        user?.user_metadata?.full_name?.split(' ')[0] ||
        user?.user_metadata?.name?.split(' ')[0] ||
        user?.email?.split('@')[0] ||
        'Usuário'

      try {
        let queryDb = supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (userId) {
          queryDb = queryDb.eq('user_id', userId)
        } else {
          queryDb = queryDb.is('user_id', null)
        }

        const { data: historyData } = await queryDb
        if (historyData) {
          chatHistory = historyData.reverse().map((h) => ({ role: h.role, content: h.content }))
        }
      } catch (e) {
        console.error('Error fetching history:', e)
      }

      let referencedIds: string[] = []
      let finalMessage = ''
      let finalConfidence = 'high'
      let finalProducts: any[] = []
      let shouldShowWhatsapp = false

      const activeAgent = await getActiveAgent()

      await new Promise((resolve) => setTimeout(resolve, 50))

      if (!activeAgent) {
        finalMessage = 'Nenhum agente de IA configurado.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Configure em Admin > Agentes AI.',
        })
      } else {
        let aiResponse: any = null
        try {
          const sanitizedHistory = chatHistory.filter((msg: any) => {
            const content = msg.content || ''
            return (
              !content.includes('Desculpe, ocorreu um erro técnico') &&
              !content.includes("I'm sorry, a technical error")
            )
          })

          const { data: aiData, error: aiErrorReq } = await supabase.functions.invoke('ai-search', {
            body: {
              query: cleanQuery,
              session_id: sessionId,
              history: sanitizedHistory,
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
            content:
              'Desculpe, ocorreu um erro ao processar a resposta da IA. Por favor, tente novamente.',
            confidence_level: 'low',
            referenced_internal_products: [],
          }
        }

        finalMessage = aiResponse?.message || aiResponse?.content || ''
        finalConfidence = aiResponse?.confidence_level || 'high'

        referencedIds = Array.isArray(aiResponse?.referenced_internal_products)
          ? aiResponse.referenced_internal_products
          : []

        const aiStock = Array.isArray(aiResponse?.stock) ? aiResponse.stock : []

        if (aiStock.length > 0) {
          finalProducts = aiStock.map((p: any) => {
            const finalUsdPrice =
              p.price_usd !== undefined ? Number(p.price_usd) : calculateFinalPrice(p)
            return {
              ...p,
              price_usa: finalUsdPrice,
              price_usd: finalUsdPrice,
              price_brl: Number(p.price_brl || 0),
              stock: Number(p.stock || 0),
            }
          })
        } else if (referencedIds.length > 0) {
          const { data: fetchedProducts } = await supabase
            .from('products')
            .select(`
              *,
              manufacturer:manufacturers (
                id,
                name
              )
            `)
            .in('id', referencedIds)
            .eq('is_discontinued', false)

          if (fetchedProducts && fetchedProducts.length > 0) {
            finalProducts = fetchedProducts.map((p: any) => {
              const finalUsdPrice = calculateFinalPrice(p)
              return {
                ...p,
                price_usa: finalUsdPrice,
                price_usd: finalUsdPrice,
                price_brl: Number(p.price_brl || 0),
                stock: Number(p.stock || 0),
              }
            })
          }
        }

        finalProducts = finalProducts.filter(
          (v: any, i: number, a: any[]) => a.findIndex((t) => t.id === v.id) === i,
        )

        shouldShowWhatsapp = !!aiResponse?.should_show_whatsapp_button

        if (extraContext?.currentProductId) {
          finalProducts = finalProducts.filter((p: any) => p.id !== extraContext.currentProductId)
          referencedIds = referencedIds.filter((id: string) => id !== extraContext.currentProductId)
        }
      }

      const combinedResults = {
        message: finalMessage,
        content: finalMessage,
        confidence_level: finalConfidence,
        stock: finalProducts,
        products: finalProducts,
        referenced_internal_products: referencedIds,
        intel: [],
        nabData: [],
        web: [],
        settings: {},
        agent_name: activeAgent?.provider_name ? 'Especialista MY WAY' : 'Busca Básica',
        should_show_whatsapp_button: shouldShowWhatsapp,
        is_intermediate: false,
      }

      console.log('SEARCH_RESULTS:', combinedResults)

      try {
        await supabase.from('chat_messages').insert([
          { session_id: sessionId, user_id: userId, role: 'user', content: cleanQuery },
          { session_id: sessionId, user_id: userId, role: 'assistant', content: finalMessage },
        ])
      } catch (e) {
        console.error('Error saving history:', e)
      }

      setResults(combinedResults)

      setTimeout(() => {
        const containers = document.querySelectorAll('#ai-response-container')
        const container = containers[containers.length - 1]
        if (container) {
          container.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      toast({
        title: 'Erro de Busca',
        description: err?.message || 'Ocorreu um erro ao consultar nossa base de dados.',
        variant: 'destructive',
      })
      return fallbackResults
    } finally {
      clearInterval(heartbeatInterval)
      setIsLoading(false)
    }
  }

  return { search, isLoading, results, clearResults }
}

export const useAiSearch = useUnifiedSearch
