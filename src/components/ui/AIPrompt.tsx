import React, { useState, useRef, KeyboardEvent } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIPromptProps {
  onSearch: (query: string) => void
  isExternalLoading?: boolean
  className?: string
}

export function AIPrompt({ onSearch, isExternalLoading, className }: AIPromptProps) {
  const [query, setQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSearch = () => {
    if (query.trim() && !isExternalLoading) {
      onSearch(query)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleClear = () => {
    setQuery('')
    textareaRef.current?.focus()
  }

  return (
    <div
      className={cn(
        'relative w-full shadow-[0_0_30px_-5px_rgba(249,115,22,0.15)] rounded-2xl group',
        className,
      )}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/10 via-orange-400/10 to-orange-500/10 rounded-[18px] blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>

      <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-orange-500/50 focus-within:border-orange-500/50 transition-all">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="O que você está procurando para sua produção? Para consultar diretamente o nosso banco de dados, utilize a barra de pesquisa do cabeçalho"
          className="flex-1 bg-transparent text-white placeholder:text-zinc-500 resize-none outline-none min-h-[4.5rem] px-4 py-3 leading-relaxed pr-28"
          rows={2}
          disabled={isExternalLoading}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
              disabled={isExternalLoading}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSearch}
            disabled={!query.trim() || isExternalLoading}
            className="p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white rounded-xl transition-all shadow-lg shadow-orange-500/20 flex-shrink-0"
          >
            {isExternalLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
