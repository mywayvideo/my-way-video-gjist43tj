import { useState } from 'react'
import { Loader2, Search, Sparkles, Flame, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AIPromptProps {
  onSearch?: (query: string) => Promise<any> | void
  onResult?: (data: any) => void
  onError?: (error: string) => void
  onLoadingChange?: (isLoading: boolean) => void
  isExternalLoading?: boolean
  className?: string
}

export function AIPrompt({
  onSearch,
  onResult,
  onError,
  onLoadingChange,
  isExternalLoading,
  className,
}: AIPromptProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localResult, setLocalResult] = useState<any>(null)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || isLoading || isExternalLoading) return

    setIsLoading(true)
    if (onLoadingChange) onLoadingChange(true)

    try {
      if (onSearch) {
        const result = await onSearch(query.trim())
        if (result) {
          setLocalResult(result)
          if (onResult) onResult(result)
        }
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

  const formatMessage = (text: string) => {
    if (!text) return null
    const parts = text.split('```')
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <pre
            key={index}
            className="bg-black/60 border border-white/10 p-4 rounded-lg my-4 overflow-x-auto text-sm font-mono text-white/80"
          >
            {part.trim()}
          </pre>
        )
      }
      const boldParts = part.split('**')
      const formatted = boldParts.map((bp, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-white font-semibold">
            {bp}
          </strong>
        ) : (
          bp
        ),
      )
      return (
        <p key={index} className="mb-4 whitespace-pre-wrap leading-relaxed">
          {formatted}
        </p>
      )
    })
  }

  return (
    <div className={cn('w-full flex flex-col items-center justify-center', className)}>
      {localResult?.has_nab_intelligence && (
        <Badge
          variant="destructive"
          className="mb-4 bg-red-600 animate-pulse text-white px-4 py-1 text-sm font-bold tracking-wider border-none"
        >
          <Flame className="w-4 h-4 mr-2 inline-block" />
          COBERTURA AO VIVO - NAB 2026
        </Badge>
      )}
      <form onSubmit={handleSearch} className="w-full max-w-3xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-white/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-500"></div>
        <div className="relative flex flex-col sm:flex-row items-center bg-black/60 border border-white/20 rounded-[2rem] shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-xl p-2 sm:p-3 overflow-hidden focus-within:border-white/50 focus-within:shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300">
          <div className="hidden sm:flex items-center justify-center pl-4 pr-2 text-white/50">
            <Sparkles
              size={24}
              className={isLoading || isExternalLoading ? 'animate-pulse text-white' : ''}
            />
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="O que você está procurando para sua produção?"
            className="w-full bg-transparent text-white placeholder:text-white/50 px-4 py-3 sm:py-4 resize-none outline-none min-h-[60px] sm:min-h-[64px] max-h-[150px] text-lg"
            disabled={isLoading || isExternalLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || isExternalLoading || !query.trim()}
            className={cn(
              'mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto px-8 py-4 rounded-full flex items-center justify-center gap-2 font-semibold transition-all duration-300 text-center',
              'bg-black border border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:bg-white/10 hover:border-white/40',
              isLoading || isExternalLoading || !query.trim()
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer',
            )}
          >
            {isLoading || isExternalLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Search size={20} />
            )}
            <span className="sm:hidden ml-2">
              {isLoading || isExternalLoading ? 'Buscando...' : 'Buscar'}
            </span>
          </button>
        </div>
      </form>

      {localResult?.message && !isLoading && !isExternalLoading && (
        <div className="w-full max-w-3xl mt-8 animate-fade-in-up">
          <div className="bg-gradient-to-b from-black/80 to-black/40 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Agente My Way</h3>
                <p className="text-xs text-white/50">Especialista em Audiovisual</p>
              </div>
            </div>
            <div className="text-white/80 prose-invert max-w-none">
              {formatMessage(localResult.message)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
