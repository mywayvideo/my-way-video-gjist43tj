import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Search as SearchIcon,
  X,
  CheckCircle2,
  Loader2,
  BrainCircuit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'
import { cn } from '@/lib/utils'

export default function Index() {
  const [query, setQuery] = useState('')
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const navigate = useNavigate()

  const loadingMessages = [
    {
      text: 'Analisando parâmetros do projeto...',
      icon: <BrainCircuit className="w-4 h-4 text-blue-500 animate-pulse" />,
    },
    {
      text: 'Consultando catálogo técnico My Way...',
      icon: <SearchIcon className="w-4 h-4 text-orange-500 animate-pulse" />,
    },
    {
      text: 'Verificando integrações e compatibilidade...',
      icon: <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />,
    },
    {
      text: 'Sintetizando recomendações...',
      icon: <CheckCircle2 className="w-4 h-4 text-green-500 animate-pulse" />,
    },
  ]

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('is_discontinued', false)
      .eq('is_special', true)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setFeaturedProducts(data || []))
  }, [])

  const handleSearch = () => {
    if (!query.trim()) return
    setIsProcessing(true)
    setLoadingStep(0)

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingMessages.length - 1) return prev + 1
        return prev
      })
    }, 800)

    setTimeout(() => {
      clearInterval(interval)
      navigate(`/search?q=${encodeURIComponent(query)}&type=ai`)
    }, 3200)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-center px-4 overflow-hidden py-24 md:py-32">
        {/* Intensified Radial Glow Effect */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-accent/20 rounded-full blur-[100px] opacity-80 mix-blend-screen" />
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-10 text-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter">
              <span className="text-white">Inteligencia em</span>{' '}
              <span className="text-yellow-500">Audiovisual PRO</span>
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

            <div
              className={cn(
                'relative flex items-center bg-card/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-3 shadow-2xl transition-all duration-300',
                isProcessing
                  ? 'border-accent/50 bg-card/80'
                  : 'focus-within:border-accent/30 focus-within:bg-card/80',
              )}
            >
              <div className="pl-5 pr-3 text-accent shrink-0 flex items-center justify-center">
                <Sparkles
                  className={cn('w-6 h-6', isProcessing ? 'animate-spin' : 'animate-pulse')}
                />
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                placeholder="Ex. Preciso de uma câmera PTZ 4K com autotracking... (utilize a barra superior no cabeçalho para pesquisar diretamente no banco de dados)"
                className="flex-1 bg-transparent border-0 focus:ring-0 resize-none h-[5rem] min-h-[5rem] max-h-[6.5rem] py-3 text-base md:text-lg placeholder:text-muted-foreground/60 text-white/90 outline-none scrollbar-hide leading-relaxed disabled:opacity-50"
                rows={2}
              />

              {query && !isProcessing && (
                <button
                  onClick={() => setQuery('')}
                  className="p-2 mr-1 text-muted-foreground hover:text-white transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Orange Pill-shaped Button */}
              <Button
                className="h-14 w-16 md:w-24 rounded-full bg-orange-500 hover:bg-orange-600 text-white shrink-0 ml-1 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleSearch}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <SearchIcon className="w-6 h-6" />
                )}
              </Button>
            </div>

            {/* Processing Tiers */}
            {isProcessing && (
              <div className="absolute top-full left-0 right-0 mt-4 flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-card/80 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-3 shadow-lg">
                  {loadingMessages[loadingStep].icon}
                  <span className="text-sm font-medium text-foreground/90">
                    {loadingMessages[loadingStep].text}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-16 mt-8">
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
