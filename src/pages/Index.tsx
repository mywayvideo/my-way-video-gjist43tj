import { useEffect, useState, useCallback, useRef } from 'react'
import { AIPrompt } from '@/components/AI/AIPrompt'
import { ResponseFormatter } from '@/components/AI/ResponseFormatter'
import { ProductCard } from '@/components/ProductCard'
import { supabase } from '@/lib/supabase/client'
import { Product } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, TrendingUp, Flame, Loader2 } from 'lucide-react'
import { useAiSearch } from '@/hooks/use-ai-search'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function Index() {
  const { search: aiSearch, isLoading: isSearchLoading, results } = useAiSearch()
  const [specials, setSpecials] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const debounceTimerRef = useRef<number | null>(null)
  const whatsappNumber = results?.settings?.company_whatsapp?.replace(/\D/g, '') || '17867161170'

  const handleSearch = useCallback(
    (query: string) => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = window.setTimeout(() => {
        if (query && query.trim()) {
          aiSearch(query)
        }
      }, 300)
    },
    [aiSearch],
  )

  useEffect(() => {
    async function fetchSpecials() {
      const { data } = await supabase.from('products').select('*').eq('is_special', true).limit(8)

      if (data) {
        const randomized = [...data].sort(() => Math.random() - 0.5)
        setSpecials(randomized)
      }
      setLoading(false)
    }
    fetchSpecials()
  }, [])

  return (
    <div className="flex flex-col gap-16 pb-24">
      <section className="relative pt-32 pb-16 px-4 flex flex-col items-center justify-center min-h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_50%)]"></div>

        <div className="text-center space-y-6 z-10 w-full max-w-5xl mx-auto animate-fade-in-up">
          {results?.has_nab_intelligence && (
            <Badge
              variant="destructive"
              className="mb-4 bg-red-600 animate-pulse text-white px-4 py-1 text-sm font-bold tracking-wider border-none"
            >
              <Flame className="w-4 h-4 mr-2 inline-block" />
              COBERTURA AO VIVO - NAB 2026
            </Badge>
          )}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Inteligência em
            <br />
            Audiovisual PRO
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Seu assistente técnico pessoal. Encontre equipamentos ideais, simule projetos e consulte
            especialistas em segundos.
          </p>

          <div
            className="pt-8 w-full flex flex-col items-center animate-fade-in relative"
            style={{ animationDelay: '200ms' }}
          >
            <div className="w-full max-w-4xl z-20 flex flex-col items-center relative">
              <AIPrompt
                onSearch={handleSearch}
                isExternalLoading={isSearchLoading}
                className="w-full"
              />
              {/* INJEÇÃO DOS TIERS EM TRANSIÇÃO NA HOME PAGE */}
              {results?.is_intermediate && (
                <div className="w-full mt-4 flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-orange-500/30 animate-pulse text-left">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  <span className="text-orange-500 font-bold text-sm tracking-wider">
                    {results.message}
                  </span>
                </div>
              )}
            </div>
          </div>

          {results && !results.is_intermediate && !Array.isArray(results) && (
            <div
              id="ai-response-container"
              className="mt-12 text-left bg-background/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 animate-fade-in-up scroll-mt-24"
            >
              <ResponseFormatter
                content={(results.content || results.message || '').replace(/my way/gi, 'MY WAY')}
                products={results.products}
                stock={results.stock}
                referenced_internal_products={results.referenced_internal_products}
                nabData={results.nabData || results.nab_data}
                intel={results.intel}
              />

              {results.should_show_whatsapp_button && (
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center justify-center space-y-4 animate-fade-in-up delay-200">
                  <p className="text-muted-foreground text-sm">{results.whatsapp_reason}</p>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg shadow-green-900/20"
                    onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                  >
                    Falar com Especialista
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 uppercase tracking-wide flex items-center gap-3 text-orange-500">
          <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
          DESTAQUES
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[350px] w-full rounded-xl bg-white/5" />
            ))}
          </div>
        ) : specials.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {specials.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10 border border-dashed border-border rounded-xl">
            Nenhum produto em destaque no momento.
          </p>
        )}
      </section>
    </div>
  )
}
