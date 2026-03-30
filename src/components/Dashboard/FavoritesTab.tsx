import { Favorite } from '@/types/customer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ShoppingCart, Eye, GitCompare, HeartOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { customerService } from '@/services/customerService'
import { toast } from 'sonner'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { ProductPrice } from '@/components/ProductPrice'

export function FavoritesTab({
  favorites,
  customerId,
  onRefresh,
}: {
  favorites: Favorite[]
  customerId: string
  onRefresh: () => void
}) {
  const navigate = useNavigate()
  const [processing, setProcessing] = useState<string | null>(null)

  const handleRemove = async (productId: string) => {
    try {
      setProcessing(productId)
      await customerService.removeFavorite(customerId, productId)
      toast.success('Removido dos favoritos')
      onRefresh()
    } catch (e) {
      toast.error('Erro ao remover favorito. Tente novamente.')
    } finally {
      setProcessing(null)
    }
  }

  const handleAddToCart = async (productId: string) => {
    try {
      setProcessing(`add-${productId}`)
      await customerService.addToCart(customerId, productId, 1)
      toast.success('Adicionado ao carrinho')
      onRefresh()
    } catch (e) {
      toast.error('Erro ao adicionar ao carrinho.')
    } finally {
      setProcessing(null)
    }
  }

  const handleCompare = (productId: string) => {
    toast.info('Comparação selecionada. (Funcionalidade em desenvolvimento)')
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg animate-fade-in">
        <HeartOff className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">Nenhum favorito ainda</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Você não adicionou nenhum produto aos favoritos. Explore nosso catálogo e salve seus
          produtos preferidos aqui!
        </p>
        <Button onClick={() => navigate('/search')}>Explorar Produtos</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {favorites.map((fav) => {
        const product = fav.products
        if (!product) return null
        const isRemoving = processing === product.id
        const isAdding = processing === `add-${product.id}`

        return (
          <Card
            key={fav.id}
            className="overflow-hidden flex flex-col group hover:shadow-md transition-all duration-200"
          >
            <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center p-4">
              <ImageWithFallback
                src={product.image_url}
                alt={product.name}
                productId={product.id}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <CardContent className="p-4 flex flex-col flex-grow">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {product.category || 'Geral'}
              </p>
              <h4 className="font-semibold text-base line-clamp-2 mb-2 flex-grow">
                {product.name}
              </h4>
              <div className="mb-4">
                <ProductPrice product={product} />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(product.id)}
                  disabled={isRemoving || isAdding}
                  title="Remover dos favoritos"
                  className="hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAddToCart(product.id)}
                  disabled={isRemoving || isAdding}
                  title="Adicionar ao carrinho"
                  className="hover:bg-green-500/10 hover:text-green-500"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/product/${product.id}`)}
                  title="Ver detalhes"
                  className="hover:bg-blue-500/10 hover:text-blue-500"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCompare(product.id)}
                  title="Comparar"
                  className="hover:bg-purple-500/10 hover:text-purple-500"
                >
                  <GitCompare className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
