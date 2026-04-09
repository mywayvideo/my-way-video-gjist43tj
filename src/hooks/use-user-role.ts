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
          // Check customers table first for the most accurate role
          const { data, error: dbError } = await supabase
            .from('customers')
            .select('role')
            .eq('user_id', user.id)
            .single()

          if (!dbError && data?.role && data.role !== 'customer') {
            return data.role
          }

          // Fallback to metadata if DB doesn't have a specific role
          const appRole = user.app_metadata?.role
          const userRole = user.user_metadata?.role

          if (appRole === 'admin' || userRole === 'admin') return 'admin'
          if (appRole === 'collaborator' || userRole === 'collaborator') return 'collaborator'
          if (appRole === 'reseller' || userRole === 'reseller') return 'reseller'
          if (appRole === 'vip' || userRole === 'vip') return 'vip'

          return data?.role || 'customer'
        })()

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 1000),
        )

        const fetchedRole = await Promise.race([fetchPromise, timeoutPromise])

        if (isMounted) {
          setRole(fetchedRole as string)
        }
      } catch (err: any) {
        console.error('Error fetching user role:', err)
        if (isMounted) {
          setError('Nao foi possivel verificar seu acesso.')
          setRole(null)
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
