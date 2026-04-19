import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string, sessionId?: string) => {
    setIsLoading(true)

    try {
      console.log('Iniciando chamada otimizada para ai-search...')
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: {
          query: query.trim(),
          session_id: sessionId,
        },
      })

      if (error) {
        throw error
      }

      setResults(data)
      return data
    } catch (err: any) {
      console.error('[useAiSearch] Error:', err)
      toast({
        title: 'Erro',
        description: 'Falha ao buscar informações técnicas. Tente novamente.',
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}
