import { Favorite } from '@/types/customer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HeartOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { customerService } from '@/services/customerService'
import { FavoriteProductCard } from '@/components/FavoriteProductCard'

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

        return (
          <FavoriteProductCard
            key={fav.id}
            product={product}
            onRemove={async (id) => {
              await customerService.removeFavorite(customerId, id)
              onRefresh()
            }}
            onAddToCart={async (id, quantity) => {
              await customerService.addToCart(customerId, id, quantity)
              onRefresh()
            }}
            isFavorited={true}
            onToggleFavorite={async (id, willBeFavorite) => {
              if (willBeFavorite) {
                await customerService.addFavorite(customerId, id)
                onRefresh()
              } else {
                await customerService.removeFavorite(customerId, id)
                onRefresh()
              }
            }}
          />
        )
      })}
    </div>
  )
}
