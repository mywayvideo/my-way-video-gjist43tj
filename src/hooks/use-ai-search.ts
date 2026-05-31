import { useState, useCallback } from 'react'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const search = useCallback(
    async (query: string, session_id: string, currentProductId?: string | null) => {
      setIsLoading(true)
      setError(null)

      try {
        const functionName = currentProductId ? 'execute_ai_search_v2_pp' : 'execute_ai_search_v2'
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

        const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            query,
            session_id,
            currentProductId: currentProductId || null,
          }),
        })

        if (!response.ok) {
          let errorMsg = 'Failed to execute AI search'
          try {
            const errData = await response.json()
            if (errData.error) errorMsg = errData.error
          } catch (e) {
            // Ignore JSON parse errors for non-JSON error responses
          }
          throw new Error(errorMsg)
        }

        const result = await response.json()
        setData(result)
        return result
      } catch (err: any) {
        setError(err.message || 'An error occurred during AI search')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { search, isLoading, error, data }
}
