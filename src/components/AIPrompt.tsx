import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Search, Sparkles, X, Loader2, RefreshCcw, MessageCircle, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { ResponseFormatter } from '@/components/ResponseFormatter'
import { ReferencedProducts } from '@/components/ReferencedProducts'
import { searchProducts } from '@/services/database-search'
import { useDebounce } from '@/hooks/use-debounce'

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
  const { toast } = useToast()

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    if (activeSearchType === 'database') {
      if (debouncedQuery.trim()) {
        performDatabaseSearch(debouncedQuery.trim())
      } else {
        setDbResults([])
        setResult(null)
      }
    }
  }, [debouncedQuery, activeSearchType])

  const performDatabaseSearch = async (searchQuery: string) => {
    setIsLoading(true)
    setError(null)

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
          type="text"
          placeholder={
            activeSearchType === 'database'
              ? 'Pesquisar no catálogo...'
              : 'O que você precisa? Pesquise produtos ou pergunte a IA.'
          }
          className="flex-1 border-0 bg-transparent text-sm md:text-lg focus-visible:ring-0 shadow-none px-2 py-5 md:py-6 h-auto disabled:opacity-50"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        {query && !isLoading && (
          <div className="pr-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:h-12 md:w-12 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setQuery('')}
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

      {isLoading && (
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

      {result?.status === 'success' && !isLoading && (
        <div className="p-6 md:p-8 bg-card border rounded-2xl shadow-sm animate-fade-in-up w-full">
          <ResponseFormatter content={result.response} />
          {result.referenced_internal_products &&
            result.referenced_internal_products.length > 0 && (
              <div className="mt-6">
                <ReferencedProducts
                  ids={result.referenced_internal_products}
                  currentProductId={activeProductId}
                />
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

      {result?.status === 'database_success' && !isLoading && (
        <div className="p-6 md:p-8 bg-card border rounded-2xl shadow-sm animate-fade-in-up w-full">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Resultados no Catálogo
          </h3>
          <ReferencedProducts ids={dbResults} currentProductId={activeProductId} />
        </div>
      )}

      {result?.status === 'database_empty' && !isLoading && (
        <div className="p-6 md:p-8 bg-card border rounded-2xl shadow-sm flex flex-col items-center justify-center text-center animate-fade-in-up w-full">
          <Database className="w-10 h-10 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
          <p className="text-muted-foreground">Tente utilizar outros termos na sua busca.</p>
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
