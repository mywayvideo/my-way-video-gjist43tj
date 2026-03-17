import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Product as ProductType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useCartStore } from '@/stores/useCartStore'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import {
  ShoppingCart,
  Bot,
  Globe,
  Loader2,
  Sparkles,
  PackageSearch,
  MessageCircle,
} from 'lucide-react'
import { performAISearch, AISearchResponse } from '@/services/ai-search'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

export default function Product() {
  const { id } = useParams()
  const { addItem } = useCartStore()
  const [product, setProduct] = useState<ProductType | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AISearchResponse | null>(null)
  const [question, setQuestion] = useState('')
  const [isMetric, setIsMetric] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('products')
      .select('*, manufacturer:manufacturers(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => data && setProduct(data))
  }, [id])

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !product) return
    setAiLoading(true)
    setAiResponse(null)
    try {
      const { data, error } = await performAISearch(
        `[Contexto do Produto: ${product.name} - SKU: ${product.sku}] ${question}`,
      )
      if (error) throw error
      if (data) {
        setAiResponse(data)
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao consultar a IA.', variant: 'destructive' })
    } finally {
      setAiLoading(false)
      setQuestion('')
    }
  }

  const displayWeight = (w: number | null) => {
    if (w === null || w === undefined) return null
    if (isMetric) return `${(w * 0.453592).toFixed(2)} kg`
    return `${w} lb`
  }

  const displayDimensions = (d: string | null) => {
    if (!d) return null
    if (isMetric) {
      return d.replace(/\d+(\.\d+)?/g, (m) => (parseFloat(m) * 2.54).toFixed(1)) + ' cm'
    }
    return `${d} in`
  }

  if (!product)
    return (
      <div className="p-12 text-center text-muted-foreground flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )

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
          {product.image_url && !imgError ? (
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50 w-full h-full">
              <PackageSearch className="w-16 h-16 mb-4 opacity-50" />
              <span className="text-sm font-medium">Imagem Indisponível</span>
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-accent font-mono uppercase tracking-widest text-sm font-semibold">
            {product.manufacturer?.name || product.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-6">
            {product.name}
          </h1>

          <div className="flex flex-col gap-4 mb-6">
            <div className="bg-card border border-white/10 rounded-xl p-5 shadow-sm max-w-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase">FOB Miami (USD)</span>
                </div>
              </div>
              <p className="text-4xl font-mono font-bold text-foreground">
                US${' '}
                {(product.price_usd || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

              {(product.price_brl || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preço entregue no Brasil:</span>
                    <span className="font-mono font-bold text-primary">
                      US${' '}
                      {product.price_brl?.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <MarkdownRenderer
            content={product.description || ''}
            className="text-lg text-foreground/80 mb-8"
          />

          <Button
            size="lg"
            onClick={() =>
              addItem({
                id: product.id,
                name: product.name,
                price: product.price_usd || 0,
                image_url: product.image_url || undefined,
                quantity: 1,
              })
            }
            className="w-full sm:w-auto h-14"
          >
            <ShoppingCart className="w-5 h-5 mr-2" /> Adicionar ao Projeto
          </Button>

          <div className="mt-10 border-t border-border/50 pt-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" /> Consultor IA Técnico
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
              <div className="text-center py-4 text-sm text-primary flex justify-center items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Buscando informações técnicas...
              </div>
            )}
            {aiResponse && !aiLoading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-card border border-primary/20 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold flex items-center gap-2">My Way Video AI</h3>
                </div>
                <div className="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">
                  {aiResponse.message}
                </div>
                {aiResponse.type === 'not_found' && (
                  <div className="pt-4 mt-2 border-t border-border/50">
                    <Button
                      onClick={() =>
                        window.open(
                          `https://wa.me/17867161170?text=${encodeURIComponent(
                            `Dúvida técnica sobre o produto ${product.name} (SKU: ${product.sku}): ${question}`,
                          )}`,
                          '_blank',
                        )
                      }
                      className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1DA851] text-white"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> Consultar Especialista via WhatsApp
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-24 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Especificações Técnicas</h2>
          <div className="flex items-center gap-3 text-sm bg-muted/50 px-4 py-2 rounded-full border border-border">
            <span className={!isMetric ? 'font-semibold text-primary' : 'text-muted-foreground'}>
              Imperial
            </span>
            <Switch checked={isMetric} onCheckedChange={setIsMetric} />
            <span className={isMetric ? 'font-semibold text-primary' : 'text-muted-foreground'}>
              Métrico
            </span>
          </div>
        </div>
        <div className="bg-card/30 border border-white/5 rounded-2xl overflow-hidden text-sm">
          {[
            { l: 'Fabricante', v: product.manufacturer?.name },
            { l: 'SKU', v: product.sku },
            { l: 'NCM', v: product.ncm },
            { l: 'Peso', v: displayWeight(product.weight) },
            { l: 'Dimensões', v: displayDimensions(product.dimensions) },
          ].map((s, i) => (
            <div
              key={s.l}
              className={`flex flex-col sm:flex-row py-3 px-6 ${i % 2 === 0 ? 'bg-white/5' : ''}`}
            >
              <span className="w-48 text-muted-foreground font-medium">{s.l}</span>
              <span className="font-mono text-foreground">{s.v || 'N/A'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
