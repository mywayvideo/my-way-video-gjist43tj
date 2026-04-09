import { useState, useEffect, useCallback } from 'react'

export function useSidebarVisibility() {
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin-sidebar-visible')
      if (stored !== null) return stored === 'true'
      return window.innerWidth >= 768
    }
    return true
  })

  useEffect(() => {
    localStorage.setItem('admin-sidebar-visible', String(isSidebarVisible))
  }, [isSidebarVisible])

  const toggleSidebar = useCallback(() => setIsSidebarVisible((prev) => !prev), [])

  return { isSidebarVisible, toggleSidebar }
}
