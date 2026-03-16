import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  MessageCircle,
  Bot,
  Search as SearchIcon,
  Video,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { AIPrompt } from '@/components/AIPrompt'
import { performAISearch, AISearchResponse } from '@/services/ai-search'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AISearchResponse | null>(null)
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    async function doSearch() {
      if (!query.trim()) {
        setAiResponse(null)
        setProducts([])
        return
      }

      setLoading(true)
      setAiResponse(null)
      setProducts([])

      try {
        const { data, error } = await performAISearch(query)
        if (error) throw error

        if (data) {
          setAiResponse(data)

          if (data.type === 'products' && data.product_ids?.length > 0) {
            const { data: productsData } = await supabase
              .from('products')
              .select('*')
              .in('id', data.product_ids)

            if (productsData) {
              setProducts(productsData)
            }
          }
        }
      } catch (error) {
        console.error('Error during AI search:', error)
      } finally {
        setLoading(false)
      }
    }

    doSearch()
  }, [query])

  const renderAIResponse = () => {
    if (!aiResponse) return null

    const getBadge = () => {
      switch (aiResponse.type) {
        case 'institutional':
          return 'Institucional'
        case 'technical':
          return 'Consultor Técnico'
        case 'products':
          return 'Inventário'
        case 'not_found':
          return 'Assistente'
        default:
          return 'Assistente'
      }
    }

    const getIcon = () => {
      if (aiResponse.type === 'technical') return <Video className="w-6 h-6 text-primary" />
      if (aiResponse.type === 'not_found') return <AlertCircle className="w-6 h-6 text-primary" />
      return <Bot className="w-6 h-6 text-primary" />
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
        <div className="bg-card border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start shadow-sm">
          <div className="bg-primary/10 p-4 rounded-full shrink-0 flex items-center justify-center">
            {getIcon()}
          </div>
          <div className="flex-1 space-y-4 w-full">
            <h3 className="font-semibold text-xl flex items-center gap-3">
              My Way Video AI
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium tracking-wide uppercase">
                {getBadge()}
              </span>
            </h3>
            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed max-w-none text-base md:text-lg">
              {aiResponse.message}
            </div>

            {aiResponse.type === 'not_found' && (
              <div className="pt-6 mt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-4">
                  Não conseguimos encontrar uma resposta completa no nosso banco de dados interno ou
                  nas fontes externas. Nossa equipe de especialistas pode te ajudar com essa
                  especificação detalhada.
                </p>
                <Button
                  size="lg"
                  className="bg-[#25D366] hover:bg-[#1DA851] text-white gap-2 font-medium shadow-md transition-transform hover:scale-105 w-full sm:w-auto"
                  onClick={() =>
                    window.open(
                      `https://wa.me/17867161170?text=${encodeURIComponent(`Olá! Gostaria de falar com um especialista sobre: "${query}"`)}`,
                      '_blank',
                    )
                  }
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com um especialista no WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl min-h-[70vh]">
      <div className="mb-8 md:mb-12">
        <AIPrompt initialQuery={query} />
      </div>

      {query && (
        <div className="flex items-center gap-3 mb-8 pb-4 border-b">
          <SearchIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Resultados para "{query}"</h1>
        </div>
      )}

      {loading && (
        <div className="flex flex-col justify-center items-center py-24 space-y-6">
          <div className="relative">
            <Loader2 className="w-14 h-14 animate-spin text-primary" />
            <Sparkles className="w-6 h-6 absolute -top-2 -right-2 text-accent animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">Pesquisa Híbrida em Andamento...</h3>
            <p className="text-muted-foreground animate-pulse font-medium max-w-md mx-auto">
              Analisando banco de dados interno e consultando a web para especificações técnicas
              detalhadas.
            </p>
          </div>
        </div>
      )}

      {!loading && renderAIResponse()}

      {!loading && aiResponse?.type === 'products' && products.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 mt-12">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Equipamentos Encontrados no Inventário
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
