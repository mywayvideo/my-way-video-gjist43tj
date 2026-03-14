import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Product as ProductType } from '@/lib/mockData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/stores/useCartStore'
import { useProductStore } from '@/stores/useProductStore'
import { toast } from '@/hooks/use-toast'
import { formatUSD } from '@/lib/utils'
import { ShoppingCart, Check, Truck, ShieldAlert, Bot, Plane, MapPin } from 'lucide-react'

export default function Product() {
  const { id } = useParams()
  const { addItem } = useCartStore()
  const { products } = useProductStore()
  const [product, setProduct] = useState<ProductType | null>(null)
  const [cep, setCep] = useState('')
  const [frete, setFrete] = useState<string | null>(null)

  useEffect(() => {
    const p = products.find((p) => p.id === id)
    setProduct(p || products[0]) // Fallback for mock
  }, [id, products])

  const handleAskAI = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('question') as HTMLInputElement
    if (!input.value.trim()) return

    toast({
      title: 'IA Analisando...',
      description: `Buscando resposta técnica para: "${input.value}" no DB em tempo real.`,
    })
    input.value = ''
  }

  const calcularFrete = () => {
    if (cep.length < 8) return
    setFrete(`Disponível para ${cep}: ${product?.deliveryModes || 'Padrão'}`)
  }

  if (!product) return null

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="text-sm text-muted-foreground mb-8 font-mono">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{' '}
        /
        <Link to={`/search?q=${product.category}`} className="hover:text-foreground mx-2">
          {product.category}
        </Link>{' '}
        /<span className="text-foreground ml-2">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/10 p-8 flex items-center justify-center">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain hover:scale-110 transition-transform duration-500"
            />
          </div>
          {/* Miniatures mock */}
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-20 h-20 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:border-accent transition-colors p-2"
              >
                <img src={product.image} alt="" className="w-full h-full object-contain" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="text-accent font-mono uppercase tracking-widest text-sm">
              {product.brand}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-2">{product.name}</h1>
          </div>

          <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-white/10 rounded-xl p-5 shadow-subtle flex flex-col">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Entrega no Brasil
                </span>
              </div>
              <p className="text-3xl font-mono font-bold text-foreground">
                {formatUSD(product.priceBrazil)}
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-5 flex flex-col">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Plane className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">Retirada Miami</span>
              </div>
              <p className="text-3xl font-mono font-light text-muted-foreground">
                {formatUSD(product.priceMiami)}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {product.inStock ? (
                <>
                  <Check className="w-4 h-4 text-green-500" /> Em estoque ({product.stockQuantity}{' '}
                  un.) - Envio Imediato
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
            disabled={!product.inStock}
            className="w-full sm:w-auto text-lg h-14 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Adicionar ao Projeto
          </Button>

          {/* Frete & IA Contextual */}
          <div className="mt-12 grid grid-cols-1 xl:grid-cols-2 gap-6 border-t border-white/10 pt-8">
            <div className="bg-card/50 border border-white/5 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5" /> Modalidades de Entrega
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Seu CEP"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
                <Button variant="secondary" onClick={calcularFrete}>
                  Consultar
                </Button>
              </div>
              {frete && <p className="text-sm text-accent mt-4 font-medium">{frete}</p>}
            </div>

            <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-blue-400">
                <Bot className="w-5 h-5" /> Pergunte à IA
              </h3>
              <form onSubmit={handleAskAI} className="space-y-3">
                <Input
                  name="question"
                  placeholder="Ex: Funciona com lente EF?"
                  className="bg-background/50 border-blue-500/20 focus-visible:ring-blue-500"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  Consultar Agente
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Specs */}
      <div className="mt-24 max-w-4xl">
        <h2 className="text-2xl font-bold mb-6 tracking-tight">Especificações Técnicas</h2>
        <div className="bg-card/30 border border-white/5 rounded-2xl overflow-hidden">
          {Object.entries(product.specs).map(([key, value], i) => (
            <div
              key={key}
              className={`flex flex-col sm:flex-row py-4 px-6 ${i % 2 === 0 ? 'bg-white/5' : ''}`}
            >
              <span className="w-48 text-muted-foreground font-medium">{key}</span>
              <span className="font-mono text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
