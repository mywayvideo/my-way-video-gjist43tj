import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Product as ProductType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/stores/useCartStore'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { ShoppingCart, Check, ShieldAlert, Bot, MapPin, Loader2 } from 'lucide-react'
import { performAISearch } from '@/services/ai-search'

export default function Product() {
  const { id } = useParams()
  const { addItem } = useCartStore()
  const [product, setProduct] = useState<ProductType | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [question, setQuestion] = useState('')

  useEffect(() => {
    if (!id) return
    async function fetchProduct() {
      const { data } = await supabase.from('products').select('*').eq('id', id).single()
      if (data) setProduct(data)
    }
    fetchProduct()
  }, [id])

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setAiLoading(true)
    setAiResponse(null)
    toast({ title: 'Consultando IA...', description: 'Buscando especificações técnicas e web.' })

    const { data } = await performAISearch(
      `Sobre o equipamento ${product?.name} (SKU: ${product?.sku}): ${question}`,
    )

    setAiLoading(false)
    if (data) setAiResponse(data.message)
    else toast({ title: 'Erro', description: 'Falha ao consultar a IA.', variant: 'destructive' })

    setQuestion('')
  }

  if (!product)
    return <div className="p-12 text-center text-muted-foreground">Carregando produto...</div>

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="text-sm text-muted-foreground mb-8 font-mono">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{' '}
        /<span className="text-foreground ml-2">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        <div className="space-y-4">
          <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/10 p-8 flex items-center justify-center">
            <img
              src={product.image_url || 'https://img.usecurling.com/p/600/600?q=camera'}
              alt={product.name}
              className="w-full h-full object-contain hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="mb-2">
            <span className="text-accent font-mono uppercase tracking-widest text-sm">
              {product.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-2">{product.name}</h1>
          </div>

          <div className="mt-8 mb-8">
            <div className="bg-card border border-white/10 rounded-xl p-5 shadow-subtle flex flex-col max-w-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Valor em Reais (BRL)
                </span>
              </div>
              <p className="text-4xl font-mono font-bold text-foreground">
                R$ {product.price_brl.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {product.stock > 0 ? (
                <>
                  <Check className="w-4 h-4 text-green-500" /> Em estoque ({product.stock} un.) -
                  Envio Imediato
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> Sob Encomenda
                </>
              )}
            </p>
          </div>

          <p className="text-lg text-foreground/80 leading-relaxed mb-8">{product.description}</p>

          <Button
            size="lg"
            onClick={() => addItem(product)}
            disabled={product.stock <= 0}
            className="w-full sm:w-auto text-lg h-14 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ShoppingCart className="w-5 h-5 mr-2" /> Adicionar ao Projeto
          </Button>

          <div className="mt-12 grid grid-cols-1 gap-6 border-t border-white/10 pt-8">
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-blue-400">
                <Bot className="w-5 h-5" /> Consultor Técnico (IA)
              </h3>
              <form onSubmit={handleAskAI} className="space-y-3">
                <Input
                  disabled={aiLoading}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Qual a resolução do sensor? Qual o native ISO?"
                  className="bg-background/50 border-blue-500/20 focus-visible:ring-blue-500"
                />
                <Button
                  type="submit"
                  disabled={aiLoading}
                  variant="outline"
                  className="w-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando Dados...
                    </>
                  ) : (
                    'Consultar Agente'
                  )}
                </Button>
              </form>
              {aiResponse && (
                <div className="mt-4 p-4 bg-background/50 rounded-lg border border-blue-500/10 text-sm text-blue-100 leading-relaxed font-mono">
                  {aiResponse}
                </div>
              )}
            </div>
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
