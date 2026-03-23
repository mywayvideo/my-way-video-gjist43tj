import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  Search,
  Sparkles,
  X,
  Loader2,
  RefreshCcw,
  MessageCircle,
  Database,
  PackageSearch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { ResponseFormatter } from '@/components/ResponseFormatter'
import { ReferencedProducts } from '@/components/ReferencedProducts'
import { searchProducts } from '@/services/database-search'
import { useDebounce } from '@/hooks/use-debounce'
import { formatPrice } from '@/utils/priceFormatter'

export function AIPrompt({
  initialQuery = '',
  productId,
  searchType: propSearchType,
}: {
  initialQuery?: string
  productId?: string
  searchType?: 'ai' | 'database'
}) {
  const { id: routeId } = useParams()
  const [searchParams] = useSearchParams()
  const activeProductId = productId || routeId

  const routeSearchType = searchParams.get('type') as 'ai' | 'database' | null
  const activeSearchType = propSearchType || routeSearchType || 'ai'

  const [query, setQuery] = useState(initialQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [dbResults, setDbResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const [responseMessage, setResponseMessage] = useState<string | null>(null)
  const [referencedProducts, setReferencedProducts] = useState<any[]>([])

  const { toast } = useToast()

  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  const clearResponse = () => {
    setResponseMessage(null)
    setReferencedProducts([])
    setResult(null)
    setDbResults([])
    setQuery('')
  }

  useEffect(() => {
    const handleClear = () => clearResponse()
    window.addEventListener('clear-search-response', handleClear)
    return () => window.removeEventListener('clear-search-response', handleClear)
  }, [])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [activeSearchType])

  useEffect(() => {
    if (activeSearchType === 'database') {
      if (debouncedQuery.trim()) {
        performDatabaseSearch(debouncedQuery.trim())
      } else {
        setDbResults([])
        setResult(null)
        setResponseMessage(null)
        setReferencedProducts([])
      }
    }
  }, [debouncedQuery, activeSearchType])

  const performDatabaseSearch = async (searchQuery: string) => {
    setIsLoading(true)
    setError(null)
    setResponseMessage(null)
    setReferencedProducts([])

    try {
      const data = await searchProducts(searchQuery)
      if (data && data.length > 0) {
        setDbResults(data)
        setResult({ status: 'database_success' })
      } else {
        setDbResults([])
        setResult({ status: 'database_empty' })
      }
    } catch (err: any) {
      console.error('Database search error:', err)
      setError('Erro ao pesquisar. Tente novamente.')
      toast({
        variant: 'destructive',
        title: 'Erro na pesquisa',
        description: 'Erro ao pesquisar. Tente novamente.',
      })
      setResult({ status: 'database_empty' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || isLoading) return

    if (activeSearchType === 'database') {
      performDatabaseSearch(query.trim())
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)
    setDbResults([])
    setResponseMessage(null)
    setReferencedProducts([])

    try {
      let sessionId = localStorage.getItem('ai-session-id')
      if (!sessionId) {
        sessionId = crypto.randomUUID
          ? crypto.randomUUID()
          : 'session-' + Math.random().toString(36).substring(2, 15)
        localStorage.setItem('ai-session-id', sessionId)
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const payload: Record<string, any> = {
        query: query.trim(),
      }

      if (activeProductId) {
        payload.productId = activeProductId
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://okpxxlpvqotwijisksui.supabase.co'}/functions/v1/ai-search`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        },
      )

      const data = await res.json()

      if (!res.ok || data.status === 'error') {
        throw new Error(
          data.error_message ||
            data.error ||
            'Ocorreu um erro ao processar sua pesquisa. Por favor, tente novamente.',
        )
      }

      if (data.session_id) {
        localStorage.setItem('ai-session-id', data.session_id)
      }

      setResult({
        ...data,
        response: data.response || data.message,
        status: 'success',
      })
      setResponseMessage(data.response || data.message)
      setReferencedProducts(data.referenced_internal_products || [])
    } catch (err: any) {
      const errorMsg =
        err.message || 'Ocorreu um erro ao processar sua pesquisa. Por favor, tente novamente.'
      setError(errorMsg)
      toast({
        variant: 'destructive',
        title: 'Erro na pesquisa',
        description: errorMsg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
      <form
        onSubmit={handleSearch}
        className="relative group flex items-center shadow-lg rounded-full overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all duration-300"
      >
        <div className="pl-6 pr-2 py-4">
          {activeSearchType === 'database' ? (
            <Database className="w-6 h-6 text-blue-500" />
          ) : (
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          )}
        </div>
        <Input
          ref={inputRef}
          type="text"
          autoFocus
          placeholder={
            activeSearchType === 'database'
              ? 'Pesquisar no catálogo...'
              : 'O que você precisa? Pesquise produtos ou pergunte a IA.'
          }
          className="flex-1 border-0 bg-transparent text-sm md:text-lg focus-visible:ring-0 shadow-none px-2 py-5 md:py-6 h-auto disabled:opacity-50"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={activeSearchType === 'ai' ? isLoading : false}
        />
        {query && !isLoading && (
          <div className="pr-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:h-12 md:w-12 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleClear}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
        <div className="pr-2 md:pr-3">
          <Button
            type="submit"
            size="icon"
            disabled={isLoading}
            className={`h-11 w-11 md:h-12 md:w-12 rounded-full text-white disabled:opacity-50 transition-colors ${activeSearchType === 'database' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary hover:bg-primary/90'}`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Search className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </Button>
        </div>
      </form>

      {isLoading && activeSearchType === 'ai' && (
        <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground animate-fade-in">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">Processando sua pesquisa...</span>
        </div>
      )}

      {error && !isLoading && activeSearchType !== 'database' && (
        <div className="p-6 border border-destructive/30 bg-destructive/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-center animate-fade-in-up">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={() => handleSearch()} variant="outline" className="gap-2 h-11 px-6">
            <RefreshCcw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </div>
      )}

      {responseMessage && result?.status === 'success' && !isLoading && (
        <div className="p-6 md:p-8 bg-card border rounded-2xl shadow-sm animate-fade-in-up w-full">
          <ResponseFormatter content={responseMessage} />
          {referencedProducts && referencedProducts.length > 0 && (
            <div className="mt-6">
              <ReferencedProducts ids={referencedProducts} currentProductId={activeProductId} />
            </div>
          )}

          {result.should_show_whatsapp_button && (
            <Button
              className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white rounded-lg p-4 h-auto"
              onClick={() =>
                window.open(
                  'https://wa.me/5561981815050?text=Olá, gostaria de falar com um especialista sobre minha dúvida.',
                  '_blank',
                )
              }
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Quer falar com um especialista? Clique aqui.
            </Button>
          )}
        </div>
      )}

      {result?.status === 'database_success' && (
        <div className="p-4 md:p-6 bg-card border rounded-2xl shadow-sm animate-fade-in-up w-full">
          <div className="flex items-center gap-2 mb-4 px-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold flex-1">Resultados no Catálogo</h3>
            {isLoading && activeSearchType === 'database' && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            )}
          </div>
          <div className="flex flex-col gap-2 w-full">
            {dbResults.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 group"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <PackageSearch className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm md:text-base truncate group-hover:text-primary transition-colors">
                    {product.name}
                  </h4>
                  {product.category && (
                    <p className="text-xs text-muted-foreground truncate">{product.category}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm md:text-sm whitespace-nowrap">
                    {formatPrice(product.price_usd).isPlaceholder ? (
                      <span className="text-[10px] italic opacity-80 uppercase text-muted-foreground">
                        Sob Consulta
                      </span>
                    ) : (
                      formatPrice(product.price_usd).text
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {result?.status === 'database_empty' && !isLoading && (
        <div className="p-6 md:p-8 bg-card border rounded-2xl shadow-sm flex flex-col items-center justify-center text-center animate-fade-in-up w-full">
          <Database className="w-10 h-10 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
          <p className="text-muted-foreground">Tente utilizar outros termos na sua busca.</p>
        </div>
      )}

      {result?.status === 'database_empty' && isLoading && activeSearchType === 'database' && (
        <div className="p-6 md:p-8 bg-card border rounded-2xl shadow-sm flex flex-col items-center justify-center text-center animate-fade-in-up w-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-muted-foreground">Buscando...</p>
        </div>
      )}

      {result?.status === 'cache_hit' && !isLoading && (
        <div className="p-6 bg-card border border-primary/20 rounded-2xl shadow-sm animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-4 bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Encontrado em base de dados
          </div>
          <h3 className="text-xl md:text-2xl font-bold mb-2">{result.product_name}</h3>
          {result.product_description && (
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {result.product_description}
            </p>
          )}
          {result.product_price != null && (
            <div className="text-2xl font-semibold text-foreground mb-6">
              {result.product_currency}{' '}
              {Number(result.product_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          )}
          {result.product_specs && Object.keys(result.product_specs).length > 0 && (
            <div className="bg-muted/50 p-4 rounded-xl">
              <h4 className="font-semibold text-sm mb-3">Especificações Técnicas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(result.product_specs).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col border-b border-border/50 pb-2 last:border-0 last:pb-0 sm:last:border-b sm:last:pb-2"
                  >
                    <span className="text-muted-foreground text-xs">{key}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
