import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AIPrompt } from '@/components/AIPrompt'
import { ProductCard } from '@/components/ProductCard'
import { Product } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Bot, Sparkles, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Product[]>([])
  const [aiMessage, setAiMessage] = useState('')

  useEffect(() => {
    if (!query) return

    const fetchData = async () => {
      setLoading(true)

      // Fetch Knowledge Base
      const { data: kbData } = await supabase
        .from('company_info')
        .select('content')
        .limit(1)
        .single()
      const kbText = kbData?.content || ''

      // Fetch Products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)

      setResults(products || [])

      // Mock AI response leveraging the real DB data
      setTimeout(() => {
        if (products && products.length > 0) {
          const p = products[0]
          setAiMessage(
            `Analisando o banco de dados... Recomendo o equipamento **${p.name}**. Custa **R$ ${p.price_brl.toLocaleString('pt-BR')}**. Temos ${p.stock > 0 ? `**${p.stock} unidades** em estoque` : 'indisponível no momento'}. \n\nLembre-se: ${kbText.substring(0, 150)}...`,
          )
        } else {
          setAiMessage(
            `Não encontrei correspondências exatas no inventário atual para "${query}". Mas não se preocupe, a My Way Video tem contato direto com os maiores fabricantes. Consulte-nos via WhatsApp para encomendas especiais!`,
          )
        }
        setLoading(false)
      }, 1000)
    }

    fetchData()
  }, [query])

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-8 min-h-[80vh]">
      <div className="bg-muted/20 border border-white/5 rounded-2xl p-6 md:p-8">
        <AIPrompt initialValue={query} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
                <Sparkles className="w-3 h-3 animate-spin" /> Processando banco de dados...
              </div>
            </div>
          ) : (
            <div className="animate-fade-in text-foreground/90 leading-relaxed space-y-4">
              <p
                dangerouslySetInnerHTML={{
                  __html: aiMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              ></p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight">Resultados da Pesquisa</h2>
            <span className="text-sm text-muted-foreground">{results.length} resultados</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Skeleton className="h-[300px] w-full rounded-xl bg-white/5" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl text-center space-y-6">
              <h3 className="text-2xl font-bold">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">
                Não achou o que procurava? Nossa equipe de especialistas pode conseguir para você.
              </p>
              <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#128C7E] text-white">
                <a href="https://wa.me/17867161170" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar com um especialista via WhatsApp
                </a>
              </Button>
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
