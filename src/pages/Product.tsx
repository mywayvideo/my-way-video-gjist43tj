import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Product as ProductType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/stores/useCartStore'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import {
  ShoppingCart,
  Check,
  ShieldAlert,
  Bot,
  MapPin,
  Loader2,
  Video,
  AlertCircle,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import { performAISearch, AISearchResponse } from '@/services/ai-search'
import { ProductCard } from '@/components/ProductCard'

export default function Product() {
  const { id } = useParams()
  const { addItem } = useCartStore()
  const [product, setProduct] = useState<ProductType | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AISearchResponse | null>(null)
  const [related, setRelated] = useState<any[]>([])
  const [question, setQuestion] = useState('')

  useEffect(() => {
    if (!id) return
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => data && setProduct(data))
  }, [id])

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !product) return
    setAiLoading(true)
    setAiResponse(null)
    setRelated([])
    toast({ title: 'Consultando IA...', description: 'Buscando dados no catálogo e na web...' })
    try {
      const { data, error } = await performAISearch(
        `[Contexto do Produto: ${product.name} - SKU: ${product.sku}] ${question}`,
      )
      if (error) throw error
      if (data) {
        setAiResponse(data)
        if (data.product_ids?.length) {
          const { data: pData } = await supabase
            .from('products')
            .select('*')
            .in('id', data.product_ids)
          if (pData) setRelated(pData)
        }
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao consultar a IA.', variant: 'destructive' })
    } finally {
      setAiLoading(false)
      setQuestion('')
    }
  }

  const getBI = (t?: string) =>
    t === 'technical'
      ? { b: 'Consultor', i: <Video className="w-5 h-5 text-primary" /> }
      : t === 'not_found'
        ? { b: 'Assistente', i: <AlertCircle className="w-5 h-5 text-primary" /> }
        : { b: 'IA', i: <Bot className="w-5 h-5 text-primary" /> }

  if (!product) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>
  const bi = getBI(aiResponse?.type)

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="text-sm text-muted-foreground mb-8 font-mono">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{' '}
        / <span className="text-foreground ml-2">{product.name}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/10 p-8 flex items-center justify-center">
          <img
            src={product.image_url || 'https://img.usecurling.com/p/600/600?q=camera'}
            alt={product.name}
            className="w-full h-full object-contain hover:scale-110 transition-transform duration-500"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-accent font-mono uppercase tracking-widest text-sm">
            {product.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-6">
            {product.name}
          </h1>
          <div className="bg-card border border-white/10 rounded-xl p-5 shadow-sm max-w-sm mb-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium uppercase">Valor (BRL)</span>
            </div>
            <p className="text-4xl font-mono font-bold text-foreground">
              R$ {product.price_brl?.toLocaleString('pt-BR')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-6">
            {product.stock > 0 ? (
              <>
                <Check className="w-4 h-4 text-green-500" /> Em estoque ({product.stock} un.)
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Sob Encomenda
              </>
            )}
          </p>
          <p className="text-lg text-foreground/80 leading-relaxed mb-8">{product.description}</p>
          <Button
            size="lg"
            onClick={() => addItem(product)}
            disabled={product.stock <= 0}
            className="w-full sm:w-auto h-14"
          >
            <ShoppingCart className="w-5 h-5 mr-2" /> Adicionar ao Projeto
          </Button>

          <div className="mt-10 border-t border-border/50 pt-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" /> Consultor IA ({product.name})
            </h3>
            <form
              onSubmit={handleAskAI}
              className="flex items-center shadow-sm rounded-full border border-border/50 bg-background/50 focus-within:ring-2 focus-within:ring-primary transition-all mb-6"
            >
              <Input
                disabled={aiLoading}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Pergunte sobre as especificações..."
                className="flex-1 border-0 bg-transparent px-6 py-6 shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                disabled={aiLoading}
                size="icon"
                className="h-12 w-12 rounded-full bg-primary mr-2"
              >
                {aiLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </Button>
            </form>
            {aiLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            {aiResponse && !aiLoading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-card border border-primary/20 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">{bi.i}</div>
                  <h3 className="font-semibold flex items-center gap-2">
                    My Way Video AI
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">
                      {bi.b}
                    </span>
                  </h3>
                </div>
                <div className="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">
                  {aiResponse.message}
                </div>
                {aiResponse.type === 'not_found' && (
                  <Button
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#1DA851] text-white mt-2 w-max"
                    onClick={() =>
                      window.open(
                        `https://wa.me/17867161170?text=${encodeURIComponent(`Olá! Quero saber mais sobre: ${product.name}`)}`,
                        '_blank',
                      )
                    }
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> Falar no WhatsApp
                  </Button>
                )}
                {related.length > 0 && (
                  <div className="mt-2 pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {related.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-24 max-w-4xl">
        <h2 className="text-2xl font-bold mb-6 tracking-tight">Especificações Técnicas</h2>
        <div className="bg-card/30 border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row py-4 px-6 bg-white/5">
            <span className="w-48 text-muted-foreground font-medium">SKU</span>
            <span className="font-mono text-foreground">{product.sku || 'N/A'}</span>
          </div>
          <div className="flex flex-col sm:flex-row py-4 px-6">
            <span className="w-48 text-muted-foreground font-medium">NCM</span>
            <span className="font-mono text-foreground">{product.ncm || 'N/A'}</span>
          </div>
          <div className="flex flex-col sm:flex-row py-4 px-6 bg-white/5">
            <span className="w-48 text-muted-foreground font-medium">Peso</span>
            <span className="font-mono text-foreground">
              {product.weight ? `${product.weight} kg` : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row py-4 px-6">
            <span className="w-48 text-muted-foreground font-medium">Dimensões</span>
            <span className="font-mono text-foreground">{product.dimensions || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
