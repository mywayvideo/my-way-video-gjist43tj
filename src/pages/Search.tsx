import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import { Loader2, MessageCircle, Bot, Search as SearchIcon, Video, AlertCircle } from 'lucide-react'
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
          return 'Especialista AV'
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
        <div className="bg-muted/30 border border-primary/20 rounded-xl p-6 md:p-8 flex gap-4 md:gap-6 items-start shadow-sm">
          <div className="bg-primary/10 p-3 rounded-full shrink-0">{getIcon()}</div>
          <div className="flex-1 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              My Way Video AI
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {getBadge()}
              </span>
            </h3>
            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
              {aiResponse.message}
            </div>

            {aiResponse.type === 'not_found' && (
              <div className="pt-2">
                <Button
                  size="lg"
                  className="bg-[#25D366] hover:bg-[#1DA851] text-white gap-2 font-medium shadow-md transition-transform hover:scale-105"
                  onClick={() =>
                    window.open(
                      `https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Gostaria de falar com um especialista sobre: "${query}"`)}`,
                      '_blank',
                    )
                  }
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com um especialista pelo WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl min-h-[70vh]">
      {!query && (
        <div className="mb-12">
          <AIPrompt />
        </div>
      )}

      {query && (
        <div className="flex items-center gap-3 mb-8 pb-4 border-b">
          <SearchIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Resultados para "{query}"</h1>
        </div>
      )}

      {loading && (
        <div className="flex flex-col justify-center items-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">
            A inteligência artificial está processando sua busca...
          </p>
        </div>
      )}

      {!loading && renderAIResponse()}

      {!loading && aiResponse?.type === 'products' && products.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
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
