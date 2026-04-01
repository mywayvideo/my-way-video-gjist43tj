import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

let cachedUser: User | null = null
let authPromise: Promise<User | null> | null = null
let isInitialized = false
let isSubscribed = false
let authSubscription: { unsubscribe: () => void } | null = null

type AuthSubscriber = (user: User | null, isLoading: boolean, error: string | null) => void
const subscribers: Set<AuthSubscriber> = new Set()

const notifySubscribers = (user: User | null, isLoading: boolean, error: string | null) => {
  subscribers.forEach((sub) => sub(user, isLoading, error))
}

export const subscribeToAuthChanges = (callback: AuthSubscriber) => {
  subscribers.add(callback)

  if (subscribers.size === 1 && !isSubscribed) {
    isSubscribed = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // FORBIDDEN: no async/await inside this callback - sync only
      const currentUser = session?.user ?? null
      cachedUser = currentUser
      isInitialized = true
      notifySubscribers(currentUser, false, null)
      if (event === 'SIGNED_OUT') {
        clearAuthCache()
      }
    })
    authSubscription = subscription
  }

  return () => {
    subscribers.delete(callback)
    if (subscribers.size === 0 && authSubscription) {
      authSubscription.unsubscribe()
      authSubscription = null
      isSubscribed = false
    }
  }
}

export const getAuthUser = (): User | null => {
  return cachedUser
}

export const clearAuthCache = () => {
  cachedUser = null
  authPromise = null
  isInitialized = false
  notifySubscribers(null, false, null)
}

const fetchUserWithRetry = async (retryCount = 0): Promise<User | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    cachedUser = user
    isInitialized = true
    notifySubscribers(cachedUser, false, null)
    return user
  } catch (error: any) {
    if (retryCount < 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return fetchUserWithRetry(retryCount + 1)
    }
    isInitialized = true
    cachedUser = null
    toast({
      title: 'Erro',
      description: 'Erro ao carregar autenticacao.',
      variant: 'destructive',
    })
    notifySubscribers(null, false, 'Erro ao carregar autenticacao.')
    return null
  }
}

const initAuth = () => {
  if (!authPromise) {
    authPromise = fetchUserWithRetry()
  }
  return authPromise
}

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(cachedUser)
  const [isLoading, setIsLoading] = useState(!isInitialized)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const unsubscribe = subscribeToAuthChanges((newUser, newIsLoading, newError) => {
      if (mounted) {
        setUser(newUser)
        setIsLoading(newIsLoading)
        setError(newError)
      }
    })

    if (!isInitialized) {
      if (mounted) setIsLoading(true)
      initAuth().then((fetchedUser) => {
        if (mounted) {
          setUser(fetchedUser)
          setIsLoading(false)
        }
      })
    } else {
      if (mounted) {
        setUser(cachedUser)
        setIsLoading(false)
      }
    }

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return { user, isLoading, error }
}
