import { useProductDiscount } from '@/hooks/useProductDiscount'
import { formatPrice } from '@/utils/priceFormatter'
import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'

export function ProductPrice({
  product,
  className,
  size, // Ignored per strict global styling rules
}: {
  product: any
  className?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const { originalPrice, discountedPrice, loading } = useProductDiscount(product)

  const rawOriginalPrice = formatPrice(originalPrice)
  const rawDiscountedPrice = discountedPrice !== null ? formatPrice(discountedPrice) : null

  const appendUSD = (val: ReturnType<typeof formatPrice>) => {
    if (val.isPlaceholder) return val.text
    return `${val.text} USD`
  }

  const displayOriginal = appendUSD(rawOriginalPrice)
  const displayCurrent = rawDiscountedPrice ? appendUSD(rawDiscountedPrice) : displayOriginal

  if (rawOriginalPrice.isPlaceholder || (rawDiscountedPrice && rawDiscountedPrice.isPlaceholder)) {
    return (
      <p
        className={cn(
          'text-[0.75rem] font-[600] text-foreground italic tracking-[0.05em] uppercase opacity-80 whitespace-nowrap flex items-center gap-1',
          className,
        )}
      >
        <HelpCircle className="w-[14px] h-[14px]" />
        {rawOriginalPrice.isPlaceholder ? displayOriginal : displayCurrent}
      </p>
    )
  }

  return (
    <div
      key={`${originalPrice}-${discountedPrice}`}
      className={cn(
        'flex flex-col gap-1 animate-in fade-in zoom-in-[0.98] duration-300',
        loading ? 'opacity-50' : 'opacity-100',
        className,
      )}
    >
      {discountedPrice !== null ? (
        <>
          <span className="text-[10px] md:text-[11px] lg:text-[12px] line-through text-muted-foreground opacity-70 font-normal leading-[1.4]">
            {displayOriginal}
          </span>
          <span className="text-[14px] md:text-[16px] lg:text-[18px] font-bold text-accent-foreground leading-[1.2]">
            {displayCurrent}
          </span>
        </>
      ) : (
        <span className="text-[14px] md:text-[16px] lg:text-[18px] text-primary font-normal leading-[1.2]">
          {displayOriginal}
        </span>
      )}
    </div>
  )
}
