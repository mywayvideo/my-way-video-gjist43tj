import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getActiveAgent, generateAgentResponse, searchIntelligence } from '@/services/intelligence'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string) => {
    if (!query || !query.trim()) return

    setIsLoading(true)

    try {
      const activeAgent = await getActiveAgent()
      const isNABQuery = /(nab|las vegas|news|novidades|lançamentos|2026)/i.test(query)

      const rawQuery = query.trim()
      const searchTerms = rawQuery.split(/\s+/).filter(Boolean)
      const exactMatch = `name.ilike.%${rawQuery}%,sku.ilike.%${rawQuery}%`
      const termsMatch = searchTerms
        .map((term) => `name.ilike.%${term}%,sku.ilike.%${term}%`)
        .join(',')
      const orProductQuery = searchTerms.length > 1 ? `${exactMatch},${termsMatch}` : exactMatch

      const { data: productsData, error: productsError } = await supabase
        .schema('public')
        .from('products')
        .select('*, manufacturers(name)')
        .or(orProductQuery)
        .eq('is_discontinued', false)
        .limit(6)

      if (productsError) throw productsError

      let miData: any[] = []
      if (isNABQuery) {
        miData = await searchIntelligence(query)
      }

      const hasNabIntelligence = miData && miData.length > 0
      const hasProducts = productsData && productsData.length > 0

      const finalProductsToDisplay = productsData || []
      const confidenceLevel = hasProducts ? 'high' : 'low'

      let message = ''
      if (!activeAgent) {
        message =
          'Nenhum agente de IA configurado. Exibindo resultados básicos de busca. Por favor, configure um agente no painel administrativo.'
        toast({
          title: 'Aviso',
          description: 'Nenhum agente configurado. Exibindo busca básica.',
        })
      } else {
        message = await generateAgentResponse(
          query,
          finalProductsToDisplay,
          miData || [],
          activeAgent.id,
          isNABQuery,
        )
      }

      if (
        isNABQuery &&
        hasNabIntelligence &&
        message &&
        !message.startsWith('Confirmamos diretamente da NAB 2026:')
      ) {
        const cleanMsg = message.replace(/^Confirmamos diretamente da NAB 2026:\s*/i, '')
        message = 'Confirmamos diretamente da NAB 2026: ' + cleanMsg
      } else if (!isNABQuery) {
        message = message.replace(/^Confirmamos diretamente da NAB 2026:\s*/i, '')
      }

      const combinedResults = {
        message,
        products: finalProductsToDisplay,
        referenced_internal_products: finalProductsToDisplay,
        mentioned_products_count: finalProductsToDisplay.length,
        should_show_whatsapp_button: !hasProducts,
        whatsapp_reason: !hasProducts
          ? 'Nenhum produto exato encontrado. Fale com um especialista.'
          : '',
        price_context: 'fob_miami',
        used_web_search: false,
        confidence_level: confidenceLevel,
        has_nab_intelligence: hasNabIntelligence,
        is_nab_query: isNABQuery,
        agent_name: activeAgent?.provider_name ? 'Especialista My Way' : 'Busca Básica',
      }

      setResults(combinedResults)
      return combinedResults
    } catch (err: any) {
      console.error('[useAiSearch] Database query error:', err)
      setResults([])
      toast({
        title: 'Erro',
        description: 'Erro ao consultar base de dados.',
        variant: 'destructive',
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}
