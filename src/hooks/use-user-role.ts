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
          // Check metadata first (app_metadata or user_metadata)
          const metadataRole =
            user.app_metadata?.role || user.user_metadata?.role || (user as any).role
          if (metadataRole) {
            return metadataRole
          }

          // Fallback to customers table
          const { data, error: dbError } = await supabase
            .from('customers')
            .select('role')
            .eq('user_id', user.id)
            .single()

          if (dbError) throw dbError
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
