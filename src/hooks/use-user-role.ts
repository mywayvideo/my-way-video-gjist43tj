import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export function useUserRole() {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchRole() {
      if (authLoading) return

      if (!user) {
        if (isMounted) {
          setRole(null)
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError(null)

        const fetchPromise = (async () => {
          const { data, error } = await supabase.functions.invoke('verify-user-role', {
            method: 'POST',
          })

          if (error) {
            throw error
          }

          if (data?.role) {
            return data.role
          }

          // Fallback to metadata se a função não retornar
          const appRole = user.app_metadata?.role
          const userRole = user.user_metadata?.role

          if (appRole === 'admin' || userRole === 'admin') return 'admin'
          if (appRole === 'collaborator' || userRole === 'collaborator') return 'collaborator'
          if (appRole === 'reseller' || userRole === 'reseller') return 'reseller'
          if (appRole === 'vip' || userRole === 'vip') return 'vip'

          return 'customer'
        })()

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000),
        )

        const fetchedRole = await Promise.race([fetchPromise, timeoutPromise])

        if (isMounted) {
          setRole(fetchedRole as string)
        }
      } catch (err: any) {
        if (err.message === 'Timeout') {
          if (import.meta.env.DEV) {
            console.log('Timeout fetching user role. Falling back to customer.')
          }
        } else {
          console.error('Error fetching user role:', err)
        }

        if (isMounted) {
          if (err.message !== 'Timeout') {
            setError('Nao foi possivel verificar seu acesso.')
          }
          setRole('customer')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchRole()

    return () => {
      isMounted = false
    }
  }, [user, authLoading])

  return { role, loading, error }
}
