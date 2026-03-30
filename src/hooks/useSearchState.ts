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

const useSearchState = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const searchQuery = searchParams.get('q') || ''

  let aiResponse = ''
  let productResults: any[] = []

  try {
    const stored = localStorage.getItem('myway-search-state')
    if (stored) {
      const parsed = JSON.parse(stored)
      aiResponse = parsed.response || ''
      productResults = parsed.products || []
    }
  } catch (e) {
    console.error('Error parsing search state:', e)
  }

  const saveSearchState = (
    query: string,
    response: string | null = null,
    products: any[] = [],
    type: 'ai' | 'database' = 'ai',
    dbResults: any[] = [],
    shouldShowWhatsapp: boolean = false,
  ) => {
    try {
      const encoded = encodeURIComponent(query)
      setSearchParams({ q: encoded })
      localStorage.setItem(
        'myway-search-state',
        JSON.stringify({
          query,
          response,
          products,
          type,
          dbResults,
          shouldShowWhatsapp,
          timestamp: Date.now(),
        }),
      )
    } catch (error) {
      console.error('Error saving search state:', error)
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
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Error restoring search state:', error)
      return null
    }
  }

  const clearSearchState = () => {
    try {
      setSearchParams({})
      localStorage.removeItem('myway-search-state')
    } catch (error) {
      console.error('Error clearing search state:', error)
    }
  }

  return {
    searchQuery,
    aiResponse,
    productResults,
    saveSearchState,
    restoreSearchState,
    clearSearchState,
  }
}

export default useSearchState
export { useSearchState }
