import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Search, Sparkles, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActiveAgent } from '@/services/intelligence'
import { Link } from 'react-router-dom'

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
  const [agentName, setAgentName] = useState('Agente My Way')

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    getActiveAgent().then((agent) => {
      if (agent) setAgentName(agent.provider_name)
    })

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const executeSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || isLoading || isExternalLoading) return

      setIsLoading(true)
      if (onLoadingChange) onLoadingChange(true)
      setLocalResult(null)

      try {
        if (onSearch) {
          const result = await onSearch(searchQuery)
          if (result) {
            setLocalResult(result)
            if (onResult) onResult(result)
          }
        }
      } catch (err: any) {
        console.error('AIPrompt Error:', err)
        if (onError) {
          onError(err.message || 'Ocorreu um erro na busca. Tente novamente.')
        }
      } finally {
        setIsLoading(false)
        if (onLoadingChange) onLoadingChange(false)
      }
    },
    [isLoading, isExternalLoading, onSearch, onLoadingChange, onResult, onError],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = setTimeout(() => {
        executeSearch(query)
      }, 300)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query)
    }, 300)
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
      <form onSubmit={handleFormSubmit} className="w-full max-w-3xl relative group">
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

      {(isLoading || isExternalLoading) && (
        <div className="w-full max-w-3xl mt-6 flex items-center gap-3 text-white/70 animate-pulse bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          <Bot className="w-5 h-5 text-primary animate-bounce" />
          <span className="font-medium tracking-wide">
            Buscando no catálogo, inteligência e web...
          </span>
        </div>
      )}

      {localResult?.message && !isLoading && !isExternalLoading && (
        <div className="w-full max-w-3xl mt-8 flex flex-col gap-6 animate-fade-in-up">
          <div className="bg-gradient-to-b from-black/80 to-black/40 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{localResult?.agent_name || agentName}</h3>
                <p className="text-xs text-white/50">Especialista em Audiovisual</p>
              </div>
            </div>
            <div className="text-white/80 prose-invert max-w-none">
              {formatMessage(localResult.message)}
            </div>
          </div>

          {localResult?.stock && localResult.stock.length > 0 && (
            <div className="w-full animate-fade-in-up delay-150">
              <h3 className="text-xl font-bold text-white mb-4 pl-2 border-l-4 border-primary">
                Produtos Relacionados
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {localResult.stock.map((product: any) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="bg-black/60 border border-white/10 rounded-xl p-4 hover:border-white/30 hover:bg-white/5 transition-all flex flex-col gap-3 group shadow-lg"
                  >
                    <div className="aspect-square rounded-lg bg-black/40 overflow-hidden relative border border-white/5">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                          Sem Imagem
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 justify-between">
                      <div>
                        <p className="text-primary text-xs font-bold uppercase tracking-wider mb-1">
                          {product.manufacturers?.name || 'My Way Video'}
                        </p>
                        <h4 className="text-white font-semibold line-clamp-2 text-sm group-hover:text-primary transition-colors">
                          {product.name}
                        </h4>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                        <div className="text-white/50 text-xs">Preço USA</div>
                        <div className="font-bold text-white">
                          {product.price_usd
                            ? `USD ${product.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : 'Consulte'}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(!localResult?.stock || localResult.stock.length === 0) && (
            <div className="w-full flex justify-center mt-4 animate-fade-in-up delay-200">
              <a
                href="https://wa.me/13055551234"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
              >
                Falar com Especialista
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
