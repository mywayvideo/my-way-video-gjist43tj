import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Search, Sparkles, Bot, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActiveAgent, getAISettings } from '@/services/intelligence'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

interface AIPromptProps {
  onSearch?: (query: string) => Promise<any> | void
  onResult?: (data: any) => void
  onError?: (error: string) => void
  onLoadingChange?: (isLoading: boolean) => void
  isExternalLoading?: boolean
  className?: string
}

function ProductCard({ product }: { product: any }) {
  const price = product.price_usa || product.price_usd
  return (
    <Link
      to={`/product/${product.id}`}
      className="bg-black/60 border border-white/10 rounded-xl p-4 hover:border-white/30 hover:bg-white/5 transition-all flex flex-col gap-3 group shadow-lg h-full"
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
            {product.manufacturers?.name || product.manufacturer?.name || 'My Way Video'}
          </p>
          <h4 className="text-white font-semibold line-clamp-2 text-sm group-hover:text-primary transition-colors">
            {product.name}
          </h4>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="text-white/50 text-xs">Preço USA</div>
          <div className="font-bold text-white">
            {price
              ? `USD ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : 'Consulte'}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ReactMarkdown({ children, className }: { children: string; className?: string }) {
  if (!children) return null

  const renderBold = (text: string) => {
    const boldParts = text.split(/\*\*(.*?)\*\*/g)
    return boldParts.map((bp, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="text-white font-bold">
          {bp}
        </strong>
      ) : (
        bp
      ),
    )
  }

  const parts = children.split('```')
  return (
    <div className={className}>
      {parts.map((part, index) => {
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

        const paragraphs = part.split('\n\n')
        return paragraphs.map((paragraph, pIndex) => {
          if (!paragraph.trim()) return null
          if (
            paragraph
              .trim()
              .split('\n')
              .some((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '))
          ) {
            const items = paragraph.split('\n')
            return (
              <ul
                key={`${index}-${pIndex}`}
                className="list-disc pl-6 mb-4 space-y-2 text-white/80"
              >
                {items.map((item, iIndex) => {
                  if (item.trim().startsWith('- ') || item.trim().startsWith('* ')) {
                    const textContent = item.replace(/^[-*]\s+/, '')
                    return <li key={iIndex}>{renderBold(textContent)}</li>
                  }
                  if (!item.trim()) return null
                  return (
                    <div key={iIndex} className="mb-1">
                      {renderBold(item)}
                    </div>
                  )
                })}
              </ul>
            )
          }

          return (
            <p
              key={`${index}-${pIndex}`}
              className="mb-4 whitespace-pre-wrap leading-relaxed text-white/80"
            >
              {renderBold(paragraph)}
            </p>
          )
        })
      })}
    </div>
  )
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
  const [settings, setSettings] = useState<any>(null)
  const [isSettingsLoading, setIsSettingsLoading] = useState(true)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    getActiveAgent().then((agent) => {
      if (agent) setAgentName(agent.provider_name)
    })

    getAISettings().then((s) => {
      setSettings(s)
      setIsSettingsLoading(false)
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

  const displayProducts =
    localResult?.products || localResult?.referenced_internal_products || localResult?.stock || []

  let showWhatsapp = localResult?.should_show_whatsapp_button || false

  if (settings && localResult) {
    if (settings.whatsapp_trigger_expensive_product) {
      const threshold = settings.price_threshold_usd || 5000
      const hasExpensive = displayProducts.some(
        (p: any) => (p.price_usa || p.price_usd || 0) > threshold,
      )
      if (hasExpensive) {
        showWhatsapp = true
      }
    }

    if (settings.whatsapp_trigger_low_confidence && localResult.confidence_level === 'low') {
      showWhatsapp = true
    }
  }

  return (
    <div className={cn('w-full flex flex-col items-center justify-center', className)}>
      <form onSubmit={handleFormSubmit} className="w-full max-w-4xl relative group z-20">
        <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-white/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-500"></div>
        <div className="relative flex flex-col sm:flex-row items-center bg-black/60 border border-white/20 rounded-[2rem] shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-xl p-2 sm:p-3 overflow-hidden focus-within:border-white/50 focus-within:shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300">
          <div className="hidden sm:flex items-center justify-center pl-4 pr-2 text-white/50">
            <Sparkles
              size={24}
              className={
                isLoading || isExternalLoading || isSettingsLoading
                  ? 'animate-pulse text-white'
                  : ''
              }
            />
          </div>
          <div className="relative w-full flex items-center">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isSettingsLoading
                  ? 'Carregando inteligência...'
                  : 'O que você está procurando para sua produção?'
              }
              className="w-full bg-transparent text-white placeholder:text-white/50 px-4 py-3 sm:py-4 pr-10 resize-none outline-none min-h-[72px] sm:min-h-[80px] max-h-[200px] text-lg"
              disabled={isLoading || isExternalLoading || isSettingsLoading}
              rows={1}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 text-white/50 hover:text-white transition-colors p-2"
                disabled={isLoading || isExternalLoading || isSettingsLoading}
              >
                <X size={20} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || isExternalLoading || !query.trim() || isSettingsLoading}
            style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
            className={cn(
              'mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto px-8 py-4 rounded-full flex items-center justify-center gap-2 font-semibold transition-all duration-300 text-center',
              'text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-lg hover:scale-105 border-0',
              isLoading || isExternalLoading || !query.trim() || isSettingsLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer',
            )}
          >
            {isLoading || isExternalLoading || isSettingsLoading ? (
              <Loader2
                size={20}
                color="white"
                className="animate-spin text-white !text-white"
                style={{ color: 'white' }}
              />
            ) : (
              <Search
                size={20}
                color="white"
                className="text-white !text-white"
                style={{ color: 'white' }}
              />
            )}
            <span className="sm:hidden ml-2 text-white !text-white" style={{ color: 'white' }}>
              {isLoading || isExternalLoading || isSettingsLoading ? 'Buscando...' : 'Buscar'}
            </span>
          </button>
        </div>
      </form>

      {(isLoading || isExternalLoading || isSettingsLoading) && query && (
        <div className="w-[95%] max-w-3xl px-6 py-4 mt-4 bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-10 animate-fade-in-down pointer-events-none">
          <div className="flex items-center justify-center gap-3">
            <div className="flex space-x-1.5">
              <div
                className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2 h-2 bg-orange-500/80 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <p className="text-center text-orange-500 text-sm md:text-base font-medium animate-pulse">
              PROCESSANDO BUSCA PROFUNDA MY WAY...
            </p>
          </div>
        </div>
      )}

      {(isLoading || isExternalLoading || isSettingsLoading) && query && (
        <div className="w-full max-w-4xl mt-6 sm:mt-8 flex flex-col gap-6 animate-fade-in-up relative z-0">
          <div className="bg-gradient-to-b from-black/80 to-black/40 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[80%]" />
            </div>
          </div>

          <div className="w-full mt-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-6 w-[250px]" />
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-black/60 border border-white/10 rounded-xl p-4 h-full flex flex-col gap-3"
                >
                  <Skeleton className="w-full aspect-square rounded-lg" />
                  <div className="space-y-2 mt-2">
                    <Skeleton className="h-3 w-[60%]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                  <div className="mt-auto pt-3 border-t border-white/10 flex justify-between">
                    <Skeleton className="h-3 w-[80px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(localResult?.content || localResult?.message) &&
        !isLoading &&
        !isExternalLoading &&
        !isSettingsLoading && (
          <div className="w-full max-w-4xl mt-8 flex flex-col gap-6 animate-fade-in-up">
            <div className="bg-gradient-to-b from-black/80 to-black/40 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {localResult?.agent_name || agentName}
                  </h3>
                  <p className="text-xs text-white/50">Especialista em Audiovisual</p>
                </div>
              </div>
              <ReactMarkdown className="prose prose-invert max-w-none text-foreground">
                {localResult.content || localResult.message}
              </ReactMarkdown>
            </div>

            {displayProducts.length > 0 && (
              <div className="w-full mt-6 animate-fade-in-up delay-150">
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-xl font-bold text-white/90 pl-3 border-l-4 border-primary">
                    Equipamentos Localizados
                  </h3>
                  <div className="h-[1px] flex-1 bg-white/10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {displayProducts.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {showWhatsapp && (
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
