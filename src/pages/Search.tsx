import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import { Loader2, MessageCircle, Bot, Search as SearchIcon, Sparkles } from 'lucide-react'
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
          if (data.related_product_ids?.length) {
            const { data: pData } = await supabase
              .from('products')
              .select('*')
              .in('id', data.related_product_ids)
            if (pData) setProducts(pData)
          }
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    doSearch()
  }, [query])

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl min-h-[70vh]">
      <div className="mb-8">
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
            <h3 className="text-xl font-semibold text-primary animate-pulse">
              O Agente de IA está pesquisando para fornecer a melhor resposta possível...
            </h3>
          </div>
        </div>
      )}

      {!loading && aiResponse && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
          <div className="bg-card border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="bg-primary/10 p-4 rounded-full shrink-0">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4 w-full">
              <h3 className="font-semibold text-xl flex items-center gap-3">
                Consultor Técnico IA{' '}
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
                  {aiResponse.type}
                </span>
              </h3>
              <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed max-w-none">
                {aiResponse.message}
              </div>
              {aiResponse.type === 'not_found' && (
                <div className="pt-6 mt-6 border-t border-border/50">
                  <Button
                    size="lg"
                    className="bg-[#25D366] hover:bg-[#1DA851] text-white"
                    onClick={() =>
                      window.open(
                        `https://wa.me/17867161170?text=${encodeURIComponent(`Dúvida técnica: "${query}"`)}`,
                        '_blank',
                      )
                    }
                  >
                    <MessageCircle className="w-5 h-5 mr-2" /> Falar com Especialista
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 mt-12">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Equipamentos Relacionados
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
