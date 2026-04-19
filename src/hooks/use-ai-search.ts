import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string) => {
    if (!query || !query.trim()) return

    setIsLoading(true)

    try {
      const searchTerm = `%${query.trim()}%`

      // Search 1: Query 'products' table using ilike on name and description
      const { data: productsData, error: productsError } = await supabase
        .schema('public')
        .from('products')
        .select('*')
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .eq('is_discontinued', false)
        .limit(6)

      if (productsError) throw productsError

      // Search 2: Query 'market_intelligence' table where status is 'published'
      const { data: miData, error: miError } = await supabase
        .schema('public')
        .from('market_intelligence')
        .select('*')
        .eq('status', 'published')
        .or(
          `title.ilike.${searchTerm},raw_content.ilike.${searchTerm},ai_summary.ilike.${searchTerm}`,
        )
        .limit(3)

      if (miError) throw miError

      const hasNabIntelligence = miData && miData.length > 0
      const hasProducts = productsData && productsData.length > 0

      // Merge results: Combine both arrays into a single state mimicking the AI response
      let message = ''
      if (hasNabIntelligence || hasProducts) {
        message = `Resultados encontrados na nossa base de dados para "${query}":\n\n`

        if (hasNabIntelligence) {
          message +=
            '**Base de Conhecimento (Notícias e Atualizações):**\n' +
            miData
              .map(
                (d: any) =>
                  `- **${d.title}**: ${d.ai_summary || d.raw_content?.substring(0, 100) + '...'}`,
              )
              .join('\n') +
            '\n\n'
        }

        if (hasProducts) {
          message += '**Produtos correspondentes no nosso catálogo:**'
        }
      } else {
        message = `Não encontramos resultados exatos para "${query}". Recomendamos falar com um especialista para opções alternativas ou produtos sob encomenda.`
      }

      const combinedResults = {
        message,
        referenced_internal_products: productsData || [],
        should_show_whatsapp_button: true, // Always offer the specialist option
        whatsapp_reason: !hasProducts
          ? 'Nenhum produto exato encontrado. Fale com um especialista.'
          : 'Fale com um especialista para confirmar disponibilidade e projetos.',
        price_context: 'fob_miami',
        used_web_search: false,
        confidence_level: hasProducts ? 'high' : 'low',
        has_nab_intelligence: hasNabIntelligence,
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
