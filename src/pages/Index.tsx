import { useEffect, useState } from 'react'
import { AIPrompt } from '@/components/AIPrompt'
import { ProductCard } from '@/components/ProductCard'
import { supabase } from '@/lib/supabase/client'
import { Product } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, TrendingUp } from 'lucide-react'
import useSearchState from '@/hooks/useSearchState'

export default function Index() {
  const { searchQuery, saveSearchState, restoreSearchState } = useSearchState()
  const [specials, setSpecials] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const handleSearch = (query: string, response: string, products: any[]) => {
    saveSearchState(query, response, products)
  }

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

        <div className="text-center space-y-6 z-10 w-full max-w-4xl animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Inteligência em
            <br />
            Audiovisual PRO
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Seu assistente técnico pessoal. Encontre equipamentos ideais, simule projetos e consulte
            especialistas em segundos.
          </p>

          <div className="pt-8 w-full animate-fade-in" style={{ animationDelay: '200ms' }}>
            <AIPrompt onSearch={handleSearch} />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 uppercase tracking-wide flex items-center gap-3 text-orange-500">
          <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
          DESTAQUES
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[350px] w-full rounded-xl bg-white/5" />
            ))}
          </div>
        ) : specials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
