import { create } from 'zustand'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export interface SearchStoreState {
  searchQuery: string
  aiResponse: string | null
  productResults: any[]
  searchTimestamp: number
  isSearchActive: boolean
  searchType: 'ai' | 'database'
  dbResults: any[]
  shouldShowWhatsapp: boolean
  setStoreState: (state: Partial<SearchStoreState>) => void
}

const useSearchStore = create<SearchStoreState>((set) => ({
  searchQuery: '',
  aiResponse: null,
  productResults: [],
  searchTimestamp: 0,
  isSearchActive: false,
  searchType: 'ai',
  dbResults: [],
  shouldShowWhatsapp: false,
  setStoreState: (state) => set(state),
}))

export const useSearchState = <T = any>(selector?: (state: any) => T): T | any => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const store = useSearchStore()

  const searchQuery = searchParams.get('q') || store.searchQuery

  const saveSearchState = (
    query: string,
    response: string | null = null,
    products: any[] = [],
    type: 'ai' | 'database' = 'ai',
    dbResults: any[] = [],
    shouldShowWhatsapp: boolean = false,
  ) => {
    try {
      setSearchParams({ q: encodeURIComponent(query) })

      const newState = {
        searchQuery: query,
        aiResponse: response,
        productResults: products,
        searchTimestamp: Date.now(),
        isSearchActive: true,
        searchType: type,
        dbResults,
        shouldShowWhatsapp,
      }

      store.setStoreState(newState)
      localStorage.setItem('myway-search-state', JSON.stringify(newState))
    } catch (e) {
      console.error('Failed to save search state', e)
      toast({
        title: 'Erro ao salvar busca',
        description: 'Não foi possível salvar a busca localmente.',
        variant: 'destructive',
      })
    }
  }

  const restoreSearchState = () => {
    try {
      const stored = localStorage.getItem('myway-search-state')
      if (stored) {
        const parsed = JSON.parse(stored)
        store.setStoreState(parsed)
        return parsed
      }
    } catch (e) {
      console.error('Failed to restore search state', e)
    }
    return null
  }

  const clearSearchState = () => {
    setSearchParams({})
    localStorage.removeItem('myway-search-state')
    sessionStorage.removeItem('search-scroll-position')
    store.setStoreState({
      searchQuery: '',
      aiResponse: null,
      productResults: [],
      searchTimestamp: 0,
      isSearchActive: false,
      searchType: 'ai',
      dbResults: [],
      shouldShowWhatsapp: false,
    })
  }

  const getSearchStateFromUrl = () => {
    return searchParams.get('q') || ''
  }

  const extendedState = {
    ...store,
    searchQuery,
    saveSearchState,
    restoreSearchState,
    clearSearchState,
    getSearchStateFromUrl,
    setSearchParams,
  }

  return selector ? selector(extendedState) : extendedState
}
