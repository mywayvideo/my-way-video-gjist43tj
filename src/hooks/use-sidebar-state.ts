import { useState, useEffect, useCallback } from 'react'

export function useSidebarState() {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    const stored = localStorage.getItem('admin-sidebar-visible')
    return stored !== null ? stored === 'true' : true
  })

  useEffect(() => {
    localStorage.setItem('admin-sidebar-visible', String(isVisible))
  }, [isVisible])

  const toggleSidebar = useCallback(() => setIsVisible((prev) => !prev), [])
  const isSidebarVisible = useCallback(() => isVisible, [isVisible])

  return { isVisible, toggleSidebar, isSidebarVisible }
}
