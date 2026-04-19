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
      // 1. Fetch active agent
      const activeAgent = await getActiveAgent()

      // Smart Keyword Extraction
      const stopWords = new Set([
        'o',
        'a',
        'os',
        'as',
        'de',
        'da',
        'do',
        'dos',
        'das',
        'em',
        'para',
        'quais',
        'na',
        'no',
        'nas',
        'nos',
        'qual',
        'que',
        'e',
        'ou',
        'com',
        'por',
      ])
      const keywords = query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word))

      if (keywords.length === 0) keywords.push(query.trim())

      const orProductQuery = keywords
        .map((k) => `name.ilike.%${k}%,description.ilike.%${k}%`)
        .join(',')

      // Search 1: Query 'products' table using ilike on name and description
      const { data: productsData, error: productsError } = await supabase
        .schema('public')
        .from('products')
        .select('*, manufacturers(name)')
        .or(orProductQuery)
        .eq('is_discontinued', false)
        .limit(6)

      if (productsError) throw productsError

      // Search 2: Query 'market_intelligence' table using flexible keywords
      const miData = await searchIntelligence(query)

      const hasNabIntelligence = miData && miData.length > 0
      const hasProducts = productsData && productsData.length > 0

      // Generate Agent Response using Edge Function
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
          productsData || [],
          miData || [],
          activeAgent.id,
        )
      }

      // UI Feedback constraint
      if (
        hasNabIntelligence &&
        message &&
        !message.startsWith('Confirmamos diretamente da NAB 2026:')
      ) {
        const cleanMsg = message.replace(/^Confirmamos diretamente da NAB 2026:\s*/i, '')
        message = 'Confirmamos diretamente da NAB 2026: ' + cleanMsg
      }

      // --- POST-PROCESSING: Product Extraction Logic ---
      const boldMatches =
        message.match(/\*\*(.*?)\*\*/g)?.map((m) => m.replace(/\*\*/g, '').trim()) || []
      const uppercaseMatches =
        message.match(/\b([A-Z][a-zA-Z0-9-]*\s+[A-Z0-9][a-zA-Z0-9-]*)\b/g) || []
      const words = message
        .replace(/[^\w\s-]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && /^[A-Z]/.test(w))
      const searchTerms = [...new Set([...boldMatches, ...uppercaseMatches, ...words])]
        .filter((t) => t.length > 2)
        .slice(0, 3)

      let secondaryProducts: any[] = []
      if (searchTerms.length > 0) {
        const orQuery = searchTerms.map((t) => `name.ilike.%${t}%`).join(',')
        const { data: secondaryData } = await supabase
          .schema('public')
          .from('products')
          .select('*, manufacturers(name)')
          .or(orQuery)
          .eq('is_discontinued', false)
          .limit(10)
        if (secondaryData) secondaryProducts = secondaryData
      }

      const allPotentialProducts = [...(productsData || []), ...secondaryProducts]
      const uniqueProducts = Array.from(
        new Map(allPotentialProducts.map((p) => [p.id, p])).values(),
      )

      const finalProductsToDisplay: any[] = []
      let mentionedCount = 0

      const messageLower = message.toLowerCase()
      uniqueProducts.forEach((p) => {
        const nameMatch = messageLower.includes(p.name.toLowerCase())
        const skuMatch = p.sku && messageLower.includes(p.sku.toLowerCase())
        const isFuzzyMatch = secondaryProducts.some((sp) => sp.id === p.id)

        if (nameMatch || skuMatch || isFuzzyMatch) {
          finalProductsToDisplay.push(p)
          mentionedCount++
        }
      })

      if (finalProductsToDisplay.length === 0 && productsData && productsData.length > 0) {
        finalProductsToDisplay.push(...productsData)
      }

      const combinedResults = {
        message,
        referenced_internal_products: finalProductsToDisplay.slice(0, 6),
        mentioned_products_count: mentionedCount,
        should_show_whatsapp_button: !hasProducts || !hasNabIntelligence,
        whatsapp_reason: !hasProducts
          ? 'Nenhum produto exato encontrado. Fale com um especialista.'
          : 'Fale com um especialista para confirmar disponibilidade e projetos.',
        price_context: 'fob_miami',
        used_web_search: false,
        confidence_level: hasProducts ? 'high' : 'low',
        has_nab_intelligence: hasNabIntelligence,
        agent_name: activeAgent?.provider_name || 'Busca Básica',
      }

      setResults(combinedResults)
      return combinedResults
    } catch (err: any) {
      console.error('[useAiSearch] Database query error:', err)
      setResults([]) // Set results to empty array on error
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
