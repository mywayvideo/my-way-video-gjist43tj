import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, HelpCircle } from 'lucide-react'
import { useCartStore } from '@/stores/useCartStore'
import { formatPrice } from '@/utils/priceFormatter'
import { cn } from '@/lib/utils'
import { useSearchState } from '@/hooks/useSearchState'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { ProductPrice } from '@/components/ProductPrice'

export function ProductCard({ product }: { product: any }) {
  const { addItem } = useCartStore()
  const { isSearchActive, searchQuery } = useSearchState()

  const searchSuffix =
    isSearchActive && searchQuery ? `?from=search&q=${encodeURIComponent(searchQuery)}` : ''
  const linkTo = `/product/${product.id}${searchSuffix}`

  const handleLinkClick = () => {
    if (isSearchActive) {
      sessionStorage.setItem('search-scroll-position', window.scrollY.toString())
    }
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden group border-border/50 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md relative">
      <CardHeader className="p-0 relative">
        {product.is_discontinued && (
          <div className="absolute top-2 right-2 z-10 bg-yellow-100 text-yellow-700 rounded-md px-2 py-1 font-[600] text-xs shadow-sm pointer-events-none">
            DESCONTINUADO
          </div>
        )}
        <Link
          to={linkTo}
          onClick={handleLinkClick}
          className="w-full h-[200px] overflow-hidden bg-muted/30 flex items-center justify-center"
        >
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            productId={product.id}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-5">
        <Link to={linkTo} onClick={handleLinkClick}>
          <h3 className="font-semibold text-sm md:text-base mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-3">
          <ProductPrice product={product} />
        </div>
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
