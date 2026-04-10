import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchRole() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.user) {
          if (isMounted) {
            setRole('customer')
            setIsLoading(false)
          }
          return
        }

        const fetchPromise = supabase
          .from('customers')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 10000),
        )

        const result = (await Promise.race([fetchPromise, timeoutPromise])) as any

        if (isMounted) {
          if (result && result.data && result.data.role) {
            setRole(result.data.role)
          } else {
            setRole('customer')
          }
        }
      } catch (error: any) {
        if (isMounted) {
          if (error.message === 'TIMEOUT') {
            console.warn(
              '[useUserRole] Timeout fetching user role (10s). Falling back to customer.',
            )
          } else {
            console.error('[useUserRole] Error fetching user role:', error)
          }
          setRole('customer')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchRole()

    return () => {
      isMounted = false
    }
  }, [])

  return { role, isLoading }
}
