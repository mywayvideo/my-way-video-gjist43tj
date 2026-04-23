import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, HelpCircle, Heart, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchState } from '@/hooks/useSearchState'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { useProductDiscount } from '@/hooks/useProductDiscount'
import { useFavorites } from '@/hooks/useFavorites'
import { useState } from 'react'
import { QuantityModal } from '@/components/QuantityModal'
import { useExchangeRate } from '@/hooks/use-exchange-rate'

export function ProductCard({ product }: { product: any }) {
  const [showQtyModal, setShowQtyModal] = useState(false)
  const { isSearchActive, searchQuery } = useSearchState()
  const exchangeRate = useExchangeRate()
  const { originalPrice, discountedPrice, discountPercentage, ruleName, currency } =
    useProductDiscount(product)
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const [favLoading, setFavLoading] = useState(false)

  const hasNationalizedPrice =
    product.price_nationalized_sales && product.price_nationalized_sales > 0
  const hasUsaPriceWithWeight = product.price_usd > 0 && product.weight > 0

  const hasPrice = hasNationalizedPrice || hasUsaPriceWithWeight

  const triggerFavoriteEffects = (e: React.MouseEvent) => {
    try {
      const audio = new Audio('/sounds/coin-drop.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        gain.gain.setValueAtTime(0.5, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
      })
    } catch (err) {
      // Ignore audio play errors
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div')
      particle.innerHTML = '❤️'
      particle.style.position = 'fixed'
      particle.style.left = `${x}px`
      particle.style.top = `${y}px`
      particle.style.color = '#ef4444'
      particle.style.fontSize = '12px'
      particle.style.pointerEvents = 'none'
      particle.style.zIndex = '9999'
      particle.style.transition = 'all 0.6s ease-out'

      const angle = Math.random() * Math.PI * 2
      const velocity = 30 + Math.random() * 40
      const tx = Math.cos(angle) * velocity
      const ty = Math.sin(angle) * velocity - 20

      document.body.appendChild(particle)

      requestAnimationFrame(() => {
        particle.style.transform = `translate(${tx}px, ${ty}px) scale(${0.5 + Math.random()})`
        particle.style.opacity = '0'
      })

      setTimeout(() => particle.remove(), 600)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const currentlyFavorite = isFavorite(product.id)

    if (!currentlyFavorite) {
      triggerFavoriteEffects(e)
    }

    setFavLoading(true)
    try {
      if (currentlyFavorite) {
        await removeFavorite(product.id)
      } else {
        await addFavorite(product.id)
      }
    } finally {
      setFavLoading(false)
    }
  }

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
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 items-end">
          {product.is_discontinued && (
            <div className="bg-yellow-100 text-yellow-700 rounded-md px-2 py-1 font-[600] text-xs shadow-sm pointer-events-none">
              DESCONTINUADO
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full shadow-sm bg-white/80 hover:bg-white backdrop-blur-sm transition-all"
            onClick={handleToggleFavorite}
            disabled={favLoading}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
              )}
            />
          </Button>
        </div>
        <Link
          to={linkTo}
          onClick={handleLinkClick}
          className="w-full h-[200px] overflow-hidden rounded bg-muted/30 flex items-center justify-center"
        >
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            productId={product.id}
            className="w-full h-full object-cover rounded transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-5 flex flex-col text-left">
        <Link to={linkTo} onClick={handleLinkClick} className="mb-2 block w-full">
          {product.manufacturers?.name && (
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
              {product.manufacturers.name}
            </span>
          )}
          <h3 className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors line-clamp-3 h-[60px] md:h-[72px] text-left">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto pt-1 flex flex-col items-start w-full">
          {discountPercentage > 0 && (
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-sm text-[10px] font-bold shadow-sm uppercase tracking-wider mb-1 inline-block">
              {discountPercentage.toFixed(0)}% OFF
            </span>
          )}
          {hasPrice ? (
            <div className="flex flex-col gap-1 w-full mt-1">
              {product.price_usd > 0 && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    USA
                  </span>
                  <div className="flex items-center gap-1">
                    {discountPercentage > 0 && currency === 'USD' && (
                      <span className="text-[10px] text-muted-foreground line-through">
                        US${' '}
                        {(originalPrice || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    <span className="font-bold text-sm text-foreground">
                      US${' '}
                      {(
                        (currency === 'USD' ? discountedPrice : product.price_usd) || 0
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
              {(product.price_brl > 0 || product.price_nationalized_sales > 0) && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-emerald-600 uppercase font-semibold">
                    Brasil
                  </span>
                  <div className="flex items-center gap-1">
                    {discountPercentage > 0 && currency === 'BRL' && (
                      <span className="text-[10px] text-muted-foreground line-through">
                        R${' '}
                        {(originalPrice || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    <span className="font-bold text-sm text-emerald-600">
                      R${' '}
                      {(() => {
                        let finalVal = 0
                        if (currency === 'BRL') {
                          finalVal = discountedPrice || 0
                        } else if (product.price_nationalized_sales > 0) {
                          finalVal =
                            product.price_nationalized_currency === 'USD'
                              ? product.price_nationalized_sales * exchangeRate
                              : product.price_nationalized_sales
                        } else {
                          finalVal = product.price_brl || 0
                        }
                        return finalVal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-muted-foreground mt-1 inline-block">
              Preço sob consulta
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto">
        {hasPrice ? (
          <Button
            className="w-full gap-2 transition-all hover:scale-[1.02]"
            onClick={() => setShowQtyModal(true)}
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar
          </Button>
        ) : (
          <Button
            className="w-full gap-2 transition-all hover:scale-[1.02] bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const msg = encodeURIComponent(
                `Olá, gostaria de uma cotação personalizada para o produto: ${product.name}`,
              )
              window.open(`https://wa.me/5561981815050?text=${msg}`, '_blank')
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Consultar Especialista
          </Button>
        )}
      </CardFooter>
      {showQtyModal && <QuantityModal product={product} onClose={() => setShowQtyModal(false)} />}
    </Card>
  )
}
