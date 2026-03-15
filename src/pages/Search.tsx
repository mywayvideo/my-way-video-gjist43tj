import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import { Loader2, MessageCircle, Bot, Search as SearchIcon } from 'lucide-react'
import { AIPrompt } from '@/components/AIPrompt'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [loading, setLoading] = useState(false)
  const [companyResult, setCompanyResult] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    async function performSearch() {
      if (!query.trim()) {
        setProducts([])
        setCompanyResult(null)
        return
      }

      setLoading(true)
      setCompanyResult(null)
      setProducts([])

      try {
        const { data: companyData } = await supabase.from('company_info').select('content')

        let isInstitutional = false
        let matchedContent = null

        if (companyData && companyData.length > 0) {
          const queryLower = query.toLowerCase()
          const institutionalKeywords = [
            'horário',
            'horario',
            'endereço',
            'endereco',
            'telefone',
            'contato',
            'sobre',
            'política',
            'politica',
            'garantia',
            'devolução',
            'devolucao',
            'local',
            'loja',
            'pagamento',
            'frete',
            'entrega',
            'cnpj',
            'funcionamento',
            'institucional',
            'quem somos',
          ]

          isInstitutional = institutionalKeywords.some((kw) => queryLower.includes(kw))

          if (!isInstitutional) {
            const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 4)
            isInstitutional = queryWords.some((w) =>
              companyData.some((c) => c.content?.toLowerCase().includes(w)),
            )
          }

          if (isInstitutional) {
            matchedContent = companyData
              .map((c) => c.content)
              .filter(Boolean)
              .join('\n\n')
          }
        }

        if (isInstitutional && matchedContent) {
          setCompanyResult(matchedContent)
        } else {
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .ilike('name', `%${query}%`)

          if (productsData && productsData.length > 0) {
            setProducts(productsData)
          } else {
            const { data: descData } = await supabase
              .from('products')
              .select('*')
              .ilike('description', `%${query}%`)

            if (descData && descData.length > 0) {
              setProducts(descData)
            }
          }
        }
      } catch (error) {
        console.error('Error during search:', error)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [query])

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
          <h1 className="text-2xl font-bold">
            {loading ? 'Pesquisando...' : `Resultados para "${query}"`}
          </h1>
        </div>
      )}

      {loading && (
        <div className="flex flex-col justify-center items-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            A inteligência artificial está processando sua busca...
          </p>
        </div>
      )}

      {!loading && companyResult && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8 flex gap-4 md:gap-6 items-start shadow-sm mb-8">
            <div className="bg-primary/20 p-3 rounded-full shrink-0">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Assistente IA My Way Video
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                  Institucional
                </span>
              </h3>
              <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                {companyResult}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !companyResult && products.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-muted-foreground font-medium">
              Encontramos {products.length} produto{products.length > 1 ? 's' : ''} no nosso
              estoque.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {!loading && !companyResult && products.length === 0 && query && (
        <div className="animate-in fade-in zoom-in-95 duration-500 bg-muted/30 border border-border rounded-xl p-8 md:p-12 text-center max-w-2xl mx-auto mt-8 shadow-sm">
          <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border">
            <Bot className="w-10 h-10 text-muted-foreground opacity-70" />
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-foreground">Produto não encontrado</h3>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Não encontrei correspondências exatas no inventário atual para '{query}'. Mas não se
            preocupe, a My Way Video tem contato direto com os maiores fabricantes.
          </p>
          <Button
            size="lg"
            className="bg-[#25D366] hover:bg-[#1DA851] text-white gap-3 font-medium h-14 px-8 text-base shadow-lg shadow-[#25D366]/20 transition-all hover:scale-105"
            onClick={() =>
              window.open(
                `https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Estava procurando por "${query}" no site e gostaria de falar com um especialista sobre disponibilidade ou encomenda.`)}`,
                '_blank',
              )
            }
          >
            <MessageCircle className="w-6 h-6" />
            Falar com um especialista pelo WhatsApp
          </Button>
        </div>
      )}
    </div>
  )
}
