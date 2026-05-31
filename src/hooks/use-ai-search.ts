import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface SearchResult {
  message?: string
  referenced_internal_products?: string[]
  confidence_level?: 'high' | 'medium' | 'low'
  should_show_whatsapp_button?: boolean
  products?: any[]
  is_intermediate?: boolean
  stock?: any[]
  nab_data?: any[]
  intel?: any[]
  settings?: any
  whatsapp_reason?: string
}

export interface SearchOptions {
  productName?: string
  technicalInfo?: string
  currentProductId?: string
}

export function useAiSearch() {
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionIdRef = useRef<string>(crypto.randomUUID())
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const search = useCallback(async (query: string, options?: SearchOptions) => {
    if (!query.trim()) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    const isProductPage = !!options?.currentProductId
    const functionName = isProductPage ? 'execute_ai_search_v2_pp' : 'execute_ai_search_v2'

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userName =
        userData?.user?.user_metadata?.full_name || userData?.user?.user_metadata?.name || 'Usuário'

      const payload = {
        query,
        session_id: sessionIdRef.current,
        currentProductId: options?.currentProductId,
        userName,
        productName: options?.productName,
        technicalInfo: options?.technicalInfo,
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: supabaseKey || '',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else {
        headers['Authorization'] = `Bearer ${supabaseKey}`
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Falha ao comunicar com o consultor IA.')
      }

      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (value) {
            buffer += decoder.decode(value, { stream: !done })

            const lines = buffer.split('\n')
            let newBuffer = ''

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim()
              if (!line) continue

              try {
                const parsed = JSON.parse(line)
                if (
                  parsed &&
                  typeof parsed === 'object' &&
                  !Array.isArray(parsed) &&
                  (parsed.is_intermediate !== undefined ||
                    parsed.message !== undefined ||
                    parsed.confidence_level !== undefined ||
                    parsed.products !== undefined)
                ) {
                  const result = parsed as SearchResult
                  if (result.is_intermediate) {
                    setResults((prev) => ({
                      ...prev,
                      ...result,
                      message: result.message || 'PROCESSANDO BUSCA PROFUNDA MY WAY...',
                    }))
                  } else {
                    setResults(result)
                  }
                } else {
                  throw new Error('Incomplete Payload Fragment')
                }
              } catch (e) {
                newBuffer += (newBuffer ? '\n' : '') + lines[i]
              }
            }
            buffer = newBuffer
          }

          if (done) {
            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim())
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  const result = parsed as SearchResult
                  if (result.is_intermediate) {
                    setResults((prev) => ({
                      ...prev,
                      ...result,
                      message: result.message || 'PROCESSANDO BUSCA PROFUNDA MY WAY...',
                    }))
                  } else {
                    setResults(result)
                  }
                }
              } catch (e) {
                console.error('Failed to parse final JSON response:', e)
              }
            }
            break
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Ignorar cancelamentos manuais
      } else {
        console.error('AI Search Error:', err)
        setError(err.message || 'Ocorreu um erro na busca.')
        setResults({
          confidence_level: 'low',
          should_show_whatsapp_button: true,
          message:
            'Desculpe, ocorreu um erro técnico ao processar sua solicitação. Por favor, tente novamente ou fale com um especialista.',
          referenced_internal_products: [],
          is_intermediate: false,
        })
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false)
      }
    }
  }, [])

  return {
    search,
    results,
    isLoading,
    error,
    clearResults,
  }
}
