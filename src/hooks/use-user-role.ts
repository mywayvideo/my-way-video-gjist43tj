import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export function useUserRole() {
  const { user } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchRole() {
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

        // Check metadata first (app_metadata or user_metadata)
        const metadataRole =
          user.app_metadata?.role || user.user_metadata?.role || (user as any).role
        if (metadataRole) {
          if (isMounted) {
            setRole(metadataRole)
            setLoading(false)
          }
          return
        }

        // Fallback to customers table
        const { data, error: dbError } = await supabase
          .from('customers')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (dbError) throw dbError

        if (isMounted) {
          if (data && data.role) {
            setRole(data.role)
          } else {
            setRole('customer') // default fallback
          }
        }
      } catch (err: any) {
        console.error('Error fetching user role:', err)
        if (isMounted) {
          setError('Nao foi possivel carregar menu')
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
  }, [user])

  return { role, loading, error }
}
