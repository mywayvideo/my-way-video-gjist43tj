import { useProductDiscount } from '@/hooks/useProductDiscount'
import { formatPrice } from '@/utils/priceFormatter'
import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'

export function ProductPrice({
  product,
  className,
  size = 'default',
}: {
  product: any
  className?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const { originalPrice, discountedPrice, discountPercentage, loading } =
    useProductDiscount(product)

  const currentPrice = discountedPrice !== null ? discountedPrice : originalPrice
  const displayPrice = formatPrice(currentPrice)
  const oldPrice = formatPrice(originalPrice)

  const sizeClasses = {
    sm: { old: 'text-[10px]', current: 'text-sm' },
    default: { old: 'text-xs', current: 'text-xl' },
    lg: { old: 'text-sm', current: 'text-4xl lg:text-5xl' },
  }

  if (displayPrice.isPlaceholder) {
    return (
      <p
        className={cn(
          'text-[0.75rem] font-[600] text-foreground italic tracking-[0.05em] uppercase opacity-80 whitespace-nowrap flex items-center gap-1',
          className,
        )}
      >
        <HelpCircle className="w-[14px] h-[14px]" />
        {displayPrice.text}
      </p>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 transition-opacity duration-300',
        loading ? 'opacity-50' : 'opacity-100',
        className,
      )}
    >
      {discountedPrice !== null && (
        <div className="flex items-center gap-2">
          <span className={cn('line-through text-muted-foreground', sizeClasses[size].old)}>
            {oldPrice.text}
          </span>
          {discountPercentage && (
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">
              -{discountPercentage}%
            </span>
          )}
        </div>
      )}
      <span
        className={cn(
          'font-bold font-mono text-foreground drop-shadow-sm',
          sizeClasses[size].current,
          discountedPrice !== null && 'text-green-600',
        )}
      >
        {displayPrice.text}
      </span>
    </div>
  )
}
