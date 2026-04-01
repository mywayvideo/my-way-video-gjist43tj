import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { playCoinSound } from '@/utils/sound'
import { toast } from 'sonner'

interface FavoriteProductCardProps {
  product: any
  onRemove: (productId: string) => Promise<void>
  onAddToCart: (productId: string, quantity: number) => Promise<void>
  isFavorited: boolean
  onToggleFavorite: (productId: string, willBeFavorite: boolean) => Promise<void>
}

export function FavoriteProductCard({
  product,
  onRemove,
  onAddToCart,
  isFavorited: initialIsFavorited,
  onToggleFavorite,
}: FavoriteProductCardProps) {
  const [isRemoved, setIsRemoved] = useState(false)
  const [quantityModalOpen, setQuantityModalOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [processingAction, setProcessingAction] = useState<'remove' | 'cart' | 'heart' | null>(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)

  const handleRemove = async () => {
    setProcessingAction('remove')
    try {
      setIsRemoved(true)
      setTimeout(async () => {
        await onRemove(product.id)
        toast.success('Removido dos favoritos')
      }, 300)
    } catch (e) {
      setIsRemoved(false)
      setProcessingAction(null)
      toast.error('Erro ao remover dos favoritos. Tente novamente.')
    }
  }

  const handleAddToCart = async () => {
    setProcessingAction('cart')
    try {
      await onAddToCart(product.id, quantity)
      setQuantityModalOpen(false)
      toast.success('Movido para o carrinho!')
      setIsRemoved(true)
      setTimeout(async () => {
        await onRemove(product.id)
      }, 300)
    } catch (e) {
      setProcessingAction(null)
      toast.error('Erro ao adicionar ao carrinho. Tente novamente.')
    }
  }

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setProcessingAction('heart')
    try {
      const willBeFavorited = !isFavorited
      await onToggleFavorite(product.id, willBeFavorited)
      setIsFavorited(willBeFavorited)

      if (willBeFavorited) {
        setShowExplosion(true)
        playCoinSound()
        setTimeout(() => setShowExplosion(false), 600)
        toast.success('Adicionado aos favoritos')
      } else {
        toast.success('Removido dos favoritos')
      }
    } catch (e) {
      toast.error('Erro ao atualizar favoritos. Tente novamente.')
    } finally {
      setProcessingAction(null)
    }
  }

  const isProcessing = processingAction !== null

  return (
    <>
      <Card
        className={cn(
          'flex flex-col h-full overflow-hidden group transition-all duration-200 border-border/50',
          isRemoved ? 'card-fade-out' : 'hover:shadow-md hover:border-primary/50',
        )}
      >
        <div className="relative w-full h-[200px] bg-muted/30 flex items-center justify-center overflow-hidden p-4">
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm bg-white/80 hover:bg-white backdrop-blur-sm transition-all relative overflow-visible"
              onClick={handleHeartClick}
              disabled={isProcessing}
            >
              {processingAction === 'heart' ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Heart
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
                  )}
                />
              )}
              {showExplosion && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2
                    const distance = 40 + Math.random() * 20
                    const tx = Math.cos(angle) * distance
                    const ty = Math.sin(angle) * distance - 10
                    return (
                      <Heart
                        key={i}
                        className="absolute h-3 w-3 fill-red-500 text-red-500 animate-heart-particle"
                        style={
                          {
                            '--tx': `${tx}px`,
                            '--ty': `${ty}px`,
                          } as React.CSSProperties
                        }
                      />
                    )
                  })}
                </div>
              )}
            </Button>
          </div>
          <Link
            to={`/product/${product.id}`}
            className="w-full h-full flex items-center justify-center"
          >
            <ImageWithFallback
              src={product.image_url}
              alt={product.name}
              productId={product.id}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        </div>

        <CardContent className="p-4 flex flex-col flex-grow">
          <Link to={`/product/${product.id}`} className="mb-2 flex-grow">
            <h4 className="font-semibold text-base line-clamp-3 group-hover:text-primary transition-colors">
              {product.name}
            </h4>
          </Link>
          <div className="font-bold text-green-600 text-lg mt-auto pt-2">
            USD {Number(product.price_usd || 0).toFixed(2)}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 gap-2 flex flex-col">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-[1.02] shadow-sm"
            onClick={() => setQuantityModalOpen(true)}
            disabled={isProcessing}
          >
            {processingAction === 'cart' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ShoppingCart className="w-4 h-4 mr-2" />
            )}
            Adicionar ao Carrinho
          </Button>
          <Button
            variant="destructive"
            className="w-full transition-all hover:scale-[1.02] shadow-sm"
            onClick={handleRemove}
            disabled={isProcessing}
          >
            {processingAction === 'remove' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Remover
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={quantityModalOpen} onOpenChange={setQuantityModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Quantidade</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Label htmlFor="quantity" className="mb-2 block">
              Quantidade
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuantityModalOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processingAction === 'cart' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
