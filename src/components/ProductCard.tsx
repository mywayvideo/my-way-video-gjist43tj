import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, PackageSearch } from 'lucide-react'
import { useCartStore } from '@/stores/useCartStore'
import { useState } from 'react'

export function ProductCard({ product }: { product: any }) {
  const { addItem } = useCartStore()
  const [imgError, setImgError] = useState(false)

  const hasImage =
    product.image_url && typeof product.image_url === 'string' && product.image_url.trim() !== ''

  return (
    <Card className="flex flex-col h-full overflow-hidden group border-border/50 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
      <CardHeader className="p-0 relative">
        <Link
          to={`/product/${product.id}`}
          className="w-full h-[200px] overflow-hidden bg-muted/30 flex items-center justify-center"
        >
          {hasImage && !imgError ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50 h-full w-full bg-muted/20">
              <PackageSearch className="w-12 h-12 mb-2" />
              <span className="text-xs font-medium">Imagem Indisponível</span>
            </div>
          )}
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-5">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm md:text-base mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-xl font-bold text-foreground mt-3">
          US${' '}
          {(product.price_usd || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto">
        <Button
          className="w-full gap-2 transition-all hover:scale-[1.02]"
          onClick={() =>
            addItem({
              id: product.id,
              name: product.name,
              price: product.price_usd || 0,
              image_url: product.image_url,
              quantity: 1,
            })
          }
        >
          <ShoppingCart className="w-4 h-4" />
          Adicionar
        </Button>
      </CardFooter>
    </Card>
  )
}
