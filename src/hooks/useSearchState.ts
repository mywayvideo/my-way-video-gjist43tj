import { create } from 'zustand'

export interface SearchState {
  searchQuery: string
  aiResponse: string | null
  productResults: any[]
  searchTimestamp: number
  isSearchActive: boolean
  searchType: 'ai' | 'database'
  dbResults: any[]
  shouldShowWhatsapp: boolean

  saveSearchState: (
    query: string,
    response: string | null,
    products: any[],
    type: 'ai' | 'database',
    dbResults?: any[],
    shouldShowWhatsapp?: boolean,
  ) => void
  restoreSearchState: () => boolean
  clearSearchState: () => void
  getSearchStateFromUrl: (searchParams: URLSearchParams) => string
}

export const useSearchState = create<SearchState>((set) => ({
  searchQuery: '',
  aiResponse: null,
  productResults: [],
  searchTimestamp: 0,
  isSearchActive: false,
  searchType: 'ai',
  dbResults: [],
  shouldShowWhatsapp: false,

  saveSearchState: (
    query,
    response,
    products,
    type,
    dbResults = [],
    shouldShowWhatsapp = false,
  ) => {
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
    try {
      localStorage.setItem('myway-search-state', JSON.stringify(newState))
    } catch (e) {
      console.error('Failed to save search state', e)
    }
    set(newState)
  },

  restoreSearchState: () => {
    try {
      const stored = localStorage.getItem('myway-search-state')
      if (stored) {
        const parsed = JSON.parse(stored)
        set(parsed)
        return true
      }
    } catch (e) {
      console.error('Failed to restore search state', e)
    }
    return false
  },

  clearSearchState: () => {
    localStorage.removeItem('myway-search-state')
    sessionStorage.removeItem('search-scroll-position')
    set({
      searchQuery: '',
      aiResponse: null,
      productResults: [],
      searchTimestamp: 0,
      isSearchActive: false,
      searchType: 'ai',
      dbResults: [],
      shouldShowWhatsapp: false,
    })
  },

  getSearchStateFromUrl: (searchParams) => {
    return searchParams.get('q') || ''
  },
}))
