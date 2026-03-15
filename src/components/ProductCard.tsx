import { Link } from 'react-router-dom'
import { Product } from '@/types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/useCartStore'
import { ShoppingCart } from 'lucide-react'
import { formatUSD } from '@/lib/utils'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCartStore()

  return (
    <Card className="group overflow-hidden bg-card/50 border-white/5 hover:border-accent/50 transition-all duration-300 flex flex-col hover:-translate-y-1">
      <Link
        to={`/product/${product.id}`}
        className="relative aspect-square overflow-hidden bg-muted/20"
      >
        <img
          src={product.image_url || 'https://img.usecurling.com/p/600/600?q=camera'}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
            <Badge variant="destructive" className="uppercase tracking-widest">
              Sob Consulta
            </Badge>
          </div>
        )}
      </Link>
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-mono">
            {product.category || 'Geral'}
          </p>
          <h3 className="font-semibold text-lg leading-tight group-hover:text-accent transition-colors line-clamp-2">
            <Link to={`/product/${product.id}`}>{product.name}</Link>
          </h3>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Preço (BRL):</span>
            <span className="font-mono text-lg text-primary-foreground font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                product.price_brl,
              )}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          onClick={() => addItem(product)}
          disabled={product.stock <= 0}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          {product.stock > 0 ? 'Adicionar' : 'Consultar'}
        </Button>
      </CardFooter>
    </Card>
  )
}
