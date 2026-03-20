import { useState, useEffect } from 'react'
import { Search, Sparkles, X, Loader2, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export function AIPrompt({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Você precisa estar logado para pesquisar.')
      }

      const res = await fetch(
        'https://okpxxlpvqotwijisksui.supabase.co/functions/v1/call-ai-agent',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query.trim(),
            include_cache: true,
          }),
        },
      )

      const data = await res.json()

      if (!res.ok || data.status === 'error') {
        throw new Error(data.error_message || data.error || 'Erro ao processar sua pesquisa')
      }

      setResult(data)
    } catch (err: any) {
      const errorMsg = err.message || 'Erro inesperado'
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
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <Input
          type="text"
          placeholder="O que você precisa? Pesquise produtos ou pergunte a IA."
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
              className="h-10 w-10 md:h-12 md:w-12 rounded-full text-muted-foreground hover:text-foreground transition-colors"
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
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
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

      {error && !isLoading && (
        <div className="p-6 border border-destructive/30 bg-destructive/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-center animate-fade-in-up">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={() => handleSearch()} variant="outline" className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </div>
      )}

      {result?.status === 'success' && !isLoading && (
        <div className="p-6 bg-card border rounded-2xl shadow-sm text-card-foreground animate-fade-in-up">
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none whitespace-pre-wrap">
            {result.response}
          </div>
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
