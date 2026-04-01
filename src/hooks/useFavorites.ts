import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncLocalToSupabase = useCallback(async () => {
    if (!user) return
    const local = localStorage.getItem('my-way-favorites')
    if (local) {
      try {
        const localFavorites: string[] = JSON.parse(local)
        if (localFavorites.length > 0) {
          const { data: existing } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', user.id)
          const existingIds = existing?.map((f) => f.product_id) || []

          const toInsert = localFavorites
            .filter((id) => !existingIds.includes(id))
            .map((id) => ({ user_id: user.id, product_id: id }))

          if (toInsert.length > 0) {
            await supabase.from('favorites').insert(toInsert)
            toast.success('Favoritos sincronizados!')
          }
        }
        localStorage.removeItem('my-way-favorites')
      } catch (e) {
        console.error('Error syncing favorites', e)
      }
    }
  }, [user])

  useEffect(() => {
    let isMounted = true

    const loadFavorites = async () => {
      setLoading(true)
      try {
        if (user) {
          await syncLocalToSupabase()
          const { data, error } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', user.id)

          if (error) throw error
          if (isMounted) setFavorites(data.map((f) => f.product_id))
        } else {
          const local = localStorage.getItem('my-way-favorites')
          if (local) {
            if (isMounted) setFavorites(JSON.parse(local))
          } else {
            if (isMounted) setFavorites([])
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadFavorites()

    let channel: any
    if (user) {
      channel = supabase
        .channel('public:favorites')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setFavorites((prev) => {
                if (!prev.includes(payload.new.product_id)) {
                  return [...prev, payload.new.product_id]
                }
                return prev
              })
            } else if (payload.eventType === 'DELETE') {
              setFavorites((prev) => prev.filter((id) => id !== payload.old.product_id))
            }
          },
        )
        .subscribe()
    }

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [user, syncLocalToSupabase])

  const addFavorite = async (productId: string) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, product_id: productId })
        if (error && error.code !== '23505') throw error
        toast.success('Adicionado aos favoritos!')
      } catch (err: any) {
        toast.error('Erro ao adicionar aos favoritos.')
        throw err
      }
    } else {
      const newFavs = [...favorites, productId]
      setFavorites(newFavs)
      localStorage.setItem('my-way-favorites', JSON.stringify(newFavs))
      toast.success('Adicionado aos favoritos!')
    }
  }

  const removeFavorite = async (productId: string) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)
        if (error) throw error
        toast.success('Removido dos favoritos!')
      } catch (err: any) {
        toast.error('Erro ao remover dos favoritos.')
        throw err
      }
    } else {
      const newFavs = favorites.filter((id) => id !== productId)
      setFavorites(newFavs)
      localStorage.setItem('my-way-favorites', JSON.stringify(newFavs))
      toast.success('Removido dos favoritos!')
    }
  }

  const isFavorite = (productId: string) => favorites.includes(productId)

  const getFavoritesList = () => favorites

  return {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    loading,
    error,
    syncLocalToSupabase,
    getFavoritesList,
  }
}
