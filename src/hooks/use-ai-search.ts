import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string) => {
    setIsLoading(true)

    try {
      console.log('Iniciando chamada otimizada para ai-search...')
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query: query.trim() },
      })

      if (error) {
        if (error.message === 'Failed to fetch' || error.message.includes('Failed to fetch')) {
          throw new Error('Erro de conexao com o banco. Verifique se o Supabase esta conectado.')
        }
        throw error
      }

      setResults(data)
      return data
    } catch (err: any) {
      console.error('[useAiSearch] Error:', err)

      const isConnectionError =
        err.message === 'Failed to fetch' ||
        err.message?.includes('Erro de conexao com o banco') ||
        err.message?.includes('Failed to fetch')

      if (isConnectionError) {
        toast({
          title: 'Erro',
          description: 'Erro de conexao com o banco. Verifique se o Supabase esta conectado.',
          variant: 'destructive',
        })

        try {
          const { data: dbData, error: dbError } = await supabase
            .schema('public')
            .from('market_intelligence')
            .select('*')
            .eq('status', 'published')
            .limit(3)

          if (!dbError && dbData && dbData.length > 0) {
            const fallbackResult = {
              message:
                'Conexão com a IA temporariamente indisponível. Aqui estão algumas informações do nosso banco de dados:\n\n' +
                dbData
                  .map(
                    (d: any) =>
                      `**${d.title}**\n${d.ai_summary || d.raw_content?.substring(0, 100) + '...'}`,
                  )
                  .join('\n\n'),
              referenced_internal_products: [],
              should_show_whatsapp_button: true,
              whatsapp_reason: 'Sistema de IA temporariamente indisponível.',
              price_context: 'fob_miami',
              used_web_search: false,
              confidence_level: 'low',
              has_nab_intelligence: true,
            }
            setResults(fallbackResult)
            return fallbackResult
          }
          return []
        } catch (fallbackErr) {
          console.error('Fallback query failed', fallbackErr)
          return []
        }
      } else {
        toast({
          title: 'Erro',
          description: 'Falha ao buscar informações técnicas. Tente novamente.',
          variant: 'destructive',
        })
        return []
      }
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}
