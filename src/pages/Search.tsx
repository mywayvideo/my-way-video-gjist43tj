import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AIPrompt } from '@/components/AIPrompt'
import { ProductCard } from '@/components/ProductCard'
import { MOCK_PRODUCTS, Product } from '@/lib/mockData'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, Sparkles } from 'lucide-react'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Product[]>([])
  const [aiMessage, setAiMessage] = useState('')

  useEffect(() => {
    if (!query) return

    setLoading(true)
    setAiMessage('')

    // Simulate AI processing and search
    const timer = setTimeout(() => {
      const lowerQuery = query.toLowerCase()
      const filtered = MOCK_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery) ||
          p.brand.toLowerCase().includes(lowerQuery),
      )

      setResults(filtered.length ? filtered : MOCK_PRODUCTS.slice(0, 3)) // Fallback to recommendations

      setAiMessage(
        `Analisando sua solicitação para "${query}"... Recomendo as opções abaixo pelo excelente custo-benefício e compatibilidade profissional. A ${filtered.length ? filtered[0].name : 'linha Sony'} atende perfeitamente à sua necessidade com entrega expressa disponível.`,
      )

      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-8 min-h-[80vh]">
      {/* Search Header */}
      <div className="bg-muted/20 border border-white/5 rounded-2xl p-6 md:p-8">
        <AIPrompt initialValue={query} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* AI Response Panel */}
        <div className="lg:col-span-4 sticky top-28 bg-card/40 border border-accent/20 rounded-xl p-6 shadow-elevation backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 text-accent">
            <Bot className="w-6 h-6" />
            <h3 className="font-semibold text-lg">MyWay AI Agent</h3>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <Skeleton className="h-4 w-full bg-accent/10" />
              <Skeleton className="h-4 w-[90%] bg-accent/10" />
              <Skeleton className="h-4 w-[80%] bg-accent/10" />
              <div className="flex items-center gap-2 pt-4 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3 animate-spin" /> Processando catálogo...
              </div>
            </div>
          ) : (
            <div className="animate-fade-in text-foreground/90 leading-relaxed space-y-4">
              <p>{aiMessage}</p>
              <div className="pt-4 border-t border-white/10 text-xs text-muted-foreground">
                <p>
                  💡 Dica: Você pode me perguntar sobre compatibilidade de lentes ou solicitar
                  orçamentos em massa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight">Equipamentos Recomendados</h2>
            <span className="text-sm text-muted-foreground">{results.length} resultados</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[250px] w-full rounded-xl bg-white/5" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px] bg-white/5" />
                    <Skeleton className="h-4 w-[200px] bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in-up">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
