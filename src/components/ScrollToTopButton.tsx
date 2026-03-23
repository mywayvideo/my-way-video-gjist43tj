import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <button
      className={cn(
        'fixed bottom-0 right-0 mb-4 mr-4 z-[40] flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-primary p-3 text-primary-foreground opacity-90 shadow-md transition-opacity duration-300 ease-in-out hover:opacity-100',
        !isVisible && 'pointer-events-none opacity-0',
      )}
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  )
}
