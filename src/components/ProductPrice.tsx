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
        'flex flex-col animate-in fade-in zoom-in-[0.95] duration-[400ms]',
        loading ? 'opacity-50' : 'opacity-100',
        className,
      )}
    >
      {discountedPrice !== null ? (
        <>
          <span className="text-[14px] line-through text-muted-foreground opacity-[0.85] font-medium leading-[1.4] mb-2">
            {displayOriginal}
          </span>
          <span
            className="text-[22px] font-extrabold text-green-600 dark:text-green-500 leading-[1.2] mt-1 bg-green-500/10 px-2 py-1 rounded-md shadow-sm w-fit animate-pulse"
            style={{ animationDuration: '1.5s' }}
          >
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
