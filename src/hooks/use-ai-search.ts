import { useState, useRef, useCallback } from 'react'

export interface AiSearchResult {
  message: string
  is_intermediate?: boolean
  confidence_level?: string
  should_show_whatsapp_button?: boolean
  referenced_internal_products?: string[]
  products?: any[]
  [key: string]: any
}

const generateSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function useAiSearch() {
  const [results, setResults] = useState<AiSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  if (!sessionIdRef.current) {
    sessionIdRef.current = generateSessionId()
  }

  const search = useCallback(
    async (query: string, currentProductId?: string | null, userName: string = 'Cliente') => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      setLoading(true)
      setError(null)
      setResults({
        message: 'PROCESSANDO BUSCA PROFUNDA MY WAY...',
        is_intermediate: true,
        confidence_level: 'low',
        should_show_whatsapp_button: false,
      })

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError('Variáveis de ambiente do Supabase ausentes.')
        setLoading(false)
        return
      }

      const endpoint = currentProductId ? 'execute_ai_search_v2_pp' : 'execute_ai_search_v2'
      const functionUrl = `${supabaseUrl}/functions/v1/${endpoint}`

      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            query,
            session_id: sessionIdRef.current,
            currentProductId: currentProductId || null,
            userName,
          }),
          signal,
        })

        if (!response.ok) {
          throw new Error(`Erro na busca: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (!signal.aborted) {
          setResults(data)
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Silently ignore abort exceptions
        } else {
          if (!signal.aborted) {
            setError(err.message || 'Erro desconhecido')
            setResults(null)
          }
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    },
    [],
  )

  const clearResults = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setResults(null)
    setError(null)
    setLoading(false)
  }, [])

  return { search, results, loading, error, clearResults }
}
