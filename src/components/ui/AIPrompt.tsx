import React, { useState, useRef, KeyboardEvent } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AIPromptProps {
  onSearch: (query: string) => void
  isExternalLoading?: boolean
  className?: string
}

export function AIPrompt({ onSearch, isExternalLoading, className }: AIPromptProps) {
  const [query, setQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (query.trim() && !isExternalLoading) {
      onSearch(query.trim())
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleClear = () => {
    setQuery('')
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div
      className={cn(
        'relative flex w-full max-w-4xl mx-auto bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl transition-all focus-within:border-orange-500/50 focus-within:bg-zinc-900/80',
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="O que você está procurando para sua produção? Para consultar diretamente o nosso banco de dados, utilize a barra de pesquisa do cabeçalho"
        className="w-full bg-transparent border-none outline-none text-white placeholder:text-zinc-500 resize-none min-h-[120px] py-6 px-8 pr-[120px] text-lg leading-relaxed focus:ring-0 rounded-[2rem]"
        rows={2}
      />

      <div className="absolute right-4 bottom-4 flex items-center gap-2">
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-10 w-10 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isExternalLoading || !query.trim()}
          className="h-12 w-12 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
        >
          {isExternalLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
