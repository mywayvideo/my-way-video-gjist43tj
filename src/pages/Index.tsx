import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Search as SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'

export default function Index() {
  const [query, setQuery] = useState('')
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('is_discontinued', false)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setFeaturedProducts(data || []))
  }, [])

  const handleSearch = () => {
    if (!query.trim()) return
    navigate(`/search?q=${encodeURIComponent(query)}&type=ai`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-center px-4 overflow-hidden py-24 md:py-32">
        {/* Intensified Radial Glow Effect */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-accent/20 rounded-full blur-[100px] opacity-80 mix-blend-screen" />
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-10 text-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter">
              A inteligência do <span className="text-accent">audiovisual</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              Descreva seu projeto ou busque o equipamento ideal. Nossa inteligência artificial
              encontrará as melhores soluções para você.
            </p>
          </div>

          {/* Refined Prompt Component */}
          <div className="w-full relative group max-w-3xl mx-auto">
            {/* Outer subtle glow for the input */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 rounded-[2.5rem] blur-xl transition-all duration-500 group-hover:blur-2xl opacity-70" />

            <div className="relative flex items-center bg-card/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-3 shadow-2xl transition-all duration-300 focus-within:border-accent/30 focus-within:bg-card/80">
              <div className="pl-5 pr-3 text-accent shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: Preciso de uma câmera para gravação de podcast em 4K..."
                className="flex-1 bg-transparent border-0 focus:ring-0 resize-none h-[3.5rem] min-h-[3.5rem] max-h-[7rem] py-3 text-base md:text-lg placeholder:text-muted-foreground/50 text-foreground outline-none scrollbar-hide leading-relaxed"
                rows={2}
              />

              {/* Orange Pill-shaped Button */}
              <Button
                className="h-14 w-16 md:w-24 rounded-full bg-orange-500 hover:bg-orange-600 text-white shrink-0 ml-2 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                onClick={handleSearch}
              >
                <SearchIcon className="w-6 h-6" />
              </Button>
            </div>

            <div className="absolute -bottom-10 left-0 right-0 text-center text-sm text-muted-foreground/60 font-medium">
              Pressione{' '}
              <kbd className="font-sans px-2 py-0.5 rounded bg-muted/50 border border-border/50 text-xs mx-1">
                Enter
              </kbd>{' '}
              para enviar
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-semibold mb-8 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Novidades e Destaques
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
