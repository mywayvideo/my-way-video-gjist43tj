import React, { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIPromptProps {
  onSearch: (query: string) => void
  isExternalLoading?: boolean
  className?: string
  placeholder?: string
}

export function AIPrompt({
  onSearch,
  isExternalLoading,
  className,
  placeholder = 'O que você esta procurando para sua produção',
}: AIPromptProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onSearch(val)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative flex items-center w-full max-w-3xl mx-auto group',
        'bg-background/40 backdrop-blur-xl border border-white/20',
        'rounded-full shadow-[0_8px_32px_-10px_rgba(255,165,0,0.15)]',
        'transition-all duration-500 hover:shadow-[0_8px_32px_-10px_rgba(255,165,0,0.25)] hover:border-orange-500/40',
        'focus-within:shadow-[0_8px_32px_-10px_rgba(255,165,0,0.35)] focus-within:border-orange-500/60 focus-within:bg-background/60',
        className,
      )}
    >
      <div className="absolute left-4 sm:left-6 flex items-center justify-center text-muted-foreground transition-colors duration-300 group-focus-within:text-orange-500">
        {isExternalLoading ? (
          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-orange-500" />
        ) : (
          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
        )}
      </div>

      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full bg-transparent border-none outline-none ring-0',
          'py-4 sm:py-5 pl-12 sm:pl-16 pr-14 sm:pr-16',
          'text-base sm:text-lg text-foreground placeholder:text-muted-foreground/60',
          'rounded-full',
        )}
      />

      <div className="absolute right-2 sm:right-3 flex items-center">
        <button
          type="submit"
          disabled={!query.trim() || isExternalLoading}
          className={cn(
            'p-2.5 sm:p-3 rounded-full bg-orange-500 text-white',
            'transition-all duration-300 shadow-md shadow-orange-500/20',
            'hover:bg-orange-600 hover:shadow-orange-500/40 hover:scale-105',
            'disabled:opacity-50 disabled:hover:bg-orange-500 disabled:hover:scale-100 disabled:hover:shadow-none',
            'active:scale-95',
          )}
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </form>
  )
}
