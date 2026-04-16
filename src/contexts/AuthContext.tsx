import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface CustomerMetadata {
  id: string
  user_id: string
  full_name: string | null
  phone: string | null
  role: string
  status: string
  [key: string]: any
}

interface AuthContextType {
  currentUser: User | null
  userRole: string | null
  userMetadata: CustomerMetadata | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userMetadata, setUserMetadata] = useState<CustomerMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const activeUserIdRef = React.useRef<string | null>(null)
  const activeUserRoleRef = React.useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchUserAndRole = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          if (isMounted) {
            setCurrentUser(null)
            setUserRole(null)
            setUserMetadata(null)
            setIsLoading(false)
          }
          return
        }

        const user = session.user
        if (isMounted) {
          setCurrentUser(user)
          activeUserIdRef.current = user.id
        }

        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (isMounted) {
          if (!customerError && customerData) {
            setUserRole(customerData.role)
            activeUserRoleRef.current = customerData.role
            setUserMetadata(customerData as CustomerMetadata)
          } else {
            setUserRole(null)
            activeUserRoleRef.current = null
            setUserMetadata(null)
          }
          setIsLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          setCurrentUser(null)
          setUserRole(null)
          activeUserRoleRef.current = null
          setUserMetadata(null)
          setIsLoading(false)
        }
      }
    }

    fetchUserAndRole()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        activeUserIdRef.current = null
        setUserRole(null)
        activeUserRoleRef.current = null
        setUserMetadata(null)
        localStorage.removeItem('user-session')
        localStorage.removeItem('user-role')
        localStorage.removeItem('user-metadata')
        setIsLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
          const isNewLogin = activeUserIdRef.current !== session.user.id
          setCurrentUser(session.user)
          activeUserIdRef.current = session.user.id

          // Treat refresh as a trigger to reload metadata if we don't have it yet
          const needsMetadataLoad = isNewLogin || !activeUserRoleRef.current

          if (needsMetadataLoad) {
            setIsLoading(true)
          }

          if (event === 'SIGNED_IN') {
            supabase
              .from('customers')
              .update({ last_login: new Date().toISOString() })
              .eq('user_id', session.user.id)
              .then()
          }

          supabase
            .from('customers')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()
            .then(({ data, error }) => {
              if (isMounted) {
                if (!error && data) {
                  setUserRole(data.role)
                  activeUserRoleRef.current = data.role
                  setUserMetadata(data as CustomerMetadata)
                } else if (error || !data) {
                  setUserRole(null)
                  activeUserRoleRef.current = null
                  setUserMetadata(null)
                }
                setIsLoading(false)
              }
            })
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      const keysToRemove = [
        'user-session',
        'user-role',
        'user-metadata',
        'theme',
        'favorites',
        'cart',
      ]
      keysToRemove.forEach((key) => localStorage.removeItem(key))

      const keysToDrop: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('my-way')) {
          keysToDrop.push(key)
        }
      }
      keysToDrop.forEach((key) => localStorage.removeItem(key))

      setCurrentUser(null)
      if (activeUserIdRef) activeUserIdRef.current = null
      setUserRole(null)
      if (activeUserRoleRef) activeUserRoleRef.current = null
      setUserMetadata(null)
      setIsLoading(false)

      window.dispatchEvent(new CustomEvent('auth-logout'))

      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
    }
  }

  const value = {
    currentUser,
    userRole,
    userMetadata,
    isLoading,
    isAuthenticated: !!currentUser,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
