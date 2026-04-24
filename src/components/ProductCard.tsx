import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Heart, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchState } from '@/hooks/useSearchState'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { useFavorites } from '@/hooks/useFavorites'
import { useState } from 'react'
import { QuantityModal } from '@/components/QuantityModal'
import { usePricing } from '@/hooks/use-pricing'
import { useProductDiscount } from '@/hooks/useProductDiscount'

export function ProductCard({ product }: { product: any }) {
  const [showQtyModal, setShowQtyModal] = useState(false)
  const { isSearchActive, searchQuery } = useSearchState()
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const [favLoading, setFavLoading] = useState(false)

  const { primaryPrice, secondaryPrice, isLoading: pricingLoading } = usePricing(product)
  const { discountPercentage } = useProductDiscount(product)

  const hasPrice = primaryPrice !== null || secondaryPrice !== null

  const triggerFavoriteEffects = (e: React.MouseEvent) => {
    try {
      const audio = new Audio('/sounds/coin-drop.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {
      /* intentionally ignored */
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
      particle.style.color = '#00FF00'
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

  const formatCurrency = (val: number, currency: string) => {
    return val
      .toLocaleString('pt-BR', {
        style: 'currency',
        currency: currency === 'USD' ? 'USD' : 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      .replace('US$', 'US$ ')
      .replace('R$', 'R$ ')
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden group bg-[#000000] border border-[#00FF00] shadow-[0_0_5px_#00FF00] text-[#00FF00] font-mono rounded-none transition-colors relative">
      <CardHeader className="p-0 relative">
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 items-end">
          {product.is_discontinued && (
            <div className="bg-[#00FF00] text-black px-2 py-1 font-bold text-xs pointer-events-none rounded-none uppercase tracking-wider shadow-sm">
              DESCONTINUADO
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-none border border-[#00FF00] bg-transparent hover:bg-[#00FF00] text-[#00FF00] hover:text-black transition-all shadow-sm"
            onClick={handleToggleFavorite}
            disabled={favLoading}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                isFavorite(product.id) ? 'fill-current' : '',
              )}
            />
          </Button>
        </div>
        <Link
          to={linkTo}
          onClick={handleLinkClick}
          className="w-full h-[200px] overflow-hidden bg-black flex items-center justify-center relative p-3"
        >
          {/* Corner brackets simulating targeting reticle */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00FF00]"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00FF00]"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00FF00]"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00FF00]"></div>

          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            productId={product.id}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-5 flex flex-col text-left">
        <Link to={linkTo} onClick={handleLinkClick} className="mb-2 block w-full">
          {product.manufacturers?.name && (
            <span className="text-[10px] md:text-xs font-bold opacity-80 uppercase tracking-wider mb-1 block">
              {product.manufacturers.name}
            </span>
          )}
          <h3 className="font-bold text-sm md:text-base line-clamp-3 h-[60px] md:h-[72px] text-left">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto pt-1 flex flex-col items-start w-full min-h-[50px]">
          {discountPercentage > 0 && (
            <span className="bg-[#00FF00] text-black px-2 py-0.5 rounded-none text-[10px] font-bold shadow-sm uppercase tracking-wider mb-1 inline-block">
              {discountPercentage.toFixed(0)}% OFF
            </span>
          )}
          {!pricingLoading ? (
            hasPrice ? (
              <div className="flex flex-col gap-1 w-full mt-1">
                {primaryPrice && (
                  <div className="text-2xl font-bold whitespace-nowrap">
                    {formatCurrency(primaryPrice.value, primaryPrice.currency)}
                  </div>
                )}
                {secondaryPrice && (
                  <div className="text-xs opacity-70 whitespace-nowrap">
                    {formatCurrency(secondaryPrice.value, secondaryPrice.currency)}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold opacity-70 mt-1 inline-block uppercase">
                PREÇO SOB CONSULTA
              </span>
            )
          ) : (
            <div className="w-full space-y-2 mt-2">
              <div className="h-6 bg-[#00FF00]/20 animate-pulse rounded-none w-full"></div>
              <div className="h-4 bg-[#00FF00]/20 animate-pulse rounded-none w-3/4"></div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto">
        {hasPrice && !pricingLoading ? (
          <Button
            className="w-full gap-2 transition-all border border-[#00FF00] bg-transparent text-[#00FF00] hover:bg-[#00FF00] hover:text-black rounded-none font-bold uppercase tracking-wider"
            onClick={() => setShowQtyModal(true)}
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar
          </Button>
        ) : (
          <Button
            className="w-full gap-2 transition-all border border-[#00FF00] bg-transparent text-[#00FF00] hover:bg-[#00FF00] hover:text-black rounded-none font-bold uppercase tracking-wider"
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
