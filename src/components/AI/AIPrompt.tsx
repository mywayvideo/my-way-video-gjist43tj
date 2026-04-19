import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIPromptProps {
  onResult?: (data: any) => void
  onError?: (error: string) => void
  onLoadingChange?: (isLoading: boolean) => void
  className?: string
}

export function AIPrompt({ onResult, onError, onLoadingChange, className }: AIPromptProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    if (onLoadingChange) onLoadingChange(true)
    console.log('Iniciando chamada para ai-search...')

    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query: query.trim() },
      })

      if (error) {
        console.error('FunctionsFetchError:', error)
        throw new Error(error.message || 'Erro ao comunicar com a inteligência artificial.')
      }

      if (onResult && data) {
        onResult(data)
      }
    } catch (err: any) {
      console.error('AIPrompt Error:', err)
      if (onError) {
        onError(err.message || 'Ocorreu um erro na busca.')
      }
    } finally {
      setIsLoading(false)
      if (onLoadingChange) onLoadingChange(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className={cn('w-full flex justify-center', className)}>
      <form onSubmit={handleSearch} className="w-full max-w-3xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-white/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-500"></div>
        <div className="relative flex flex-col sm:flex-row items-center bg-black/60 border border-white/20 rounded-[2rem] shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-xl p-2 sm:p-3 overflow-hidden focus-within:border-white/50 focus-within:shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300">
          <div className="hidden sm:flex items-center justify-center pl-4 pr-2 text-white/50">
            <Sparkles size={24} className={isLoading ? 'animate-pulse text-white' : ''} />
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="O que você está procurando para sua produção?"
            className="w-full bg-transparent text-white placeholder:text-white/50 px-4 py-3 sm:py-4 resize-none outline-none min-h-[60px] sm:min-h-[64px] max-h-[150px] text-lg"
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={cn(
              'mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto px-8 py-4 rounded-full flex items-center justify-center gap-2 font-semibold transition-all duration-300',
              'border border-white/40 bg-white/10 text-white hover:bg-white/20 hover:border-white/80',
              'shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]',
              isLoading || !query.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
            <span className="sm:hidden ml-2">{isLoading ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
