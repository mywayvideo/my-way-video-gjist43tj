import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AIPrompt } from '@/components/AIPrompt'
import { ProductCard } from '@/components/ProductCard'
import { supabase } from '@/lib/supabase/client'
import { Product } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

export default function Index() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopProducts() {
      const { data } = await supabase.from('products').select('*').limit(4)
      if (data) setProducts(data)
      setLoading(false)
    }
    fetchTopProducts()
  }, [])

  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* Hero / Command Center */}
      <section className="relative pt-32 pb-20 px-4 flex flex-col items-center justify-center min-h-[70vh] overflow-hidden">
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
            <AIPrompt />
          </div>

          <div
            className="pt-8 flex flex-wrap justify-center gap-2 opacity-80 animate-fade-in"
            style={{ animationDelay: '400ms' }}
          >
            {['Câmera para streaming', 'Lentes anamórficas', 'Kit iluminação podcast'].map(
              (suggestion) => (
                <Link
                  key={suggestion}
                  to={`/search?q=${encodeURIComponent(suggestion)}`}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-colors"
                >
                  {suggestion}
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8 uppercase tracking-wide border-b border-white/10 pb-4 flex items-center gap-2">
          Recomendados pela IA{' '}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </span>
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[350px] w-full rounded-xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
