import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'

export function ProductPrice({
  originalPrice,
  discountedPrice,
  weight,
  discountPercentage,
  className,
  size,
}: {
  originalPrice: number | null | undefined
  discountedPrice?: number | null | undefined
  weight?: number | null | undefined
  discountPercentage?: number | null
  className?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  if (originalPrice === null || originalPrice === undefined || originalPrice <= 0) {
    return (
      <p
        className={cn(
          'text-[0.875rem] font-[600] text-foreground italic tracking-[0.05em] uppercase opacity-80 whitespace-nowrap flex items-center gap-1.5',
          className,
        )}
      >
        <HelpCircle className="w-[14px] h-[14px]" />
        Preço sob consulta
      </p>
    )
  }

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val)

  const showDiscount =
    discountedPrice !== null &&
    discountedPrice !== undefined &&
    discountedPrice < originalPrice &&
    discountedPrice > 0

  return (
    <div
      className={cn(
        'flex flex-col animate-in fade-in zoom-in-[0.95] duration-500 opacity-100',
        className,
      )}
    >
      {showDiscount ? (
        <>
          <span className="text-[14px] line-through text-muted-foreground opacity-[0.85] font-medium leading-[1.4] mb-2">
            {formatUSD(originalPrice)}
          </span>
          <span
            className={cn(
              'font-extrabold text-green-500 leading-[1.2] bg-green-500/10 px-2 py-1 rounded-md shadow-sm w-fit',
              size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[26px]' : 'text-[22px]',
            )}
          >
            {formatUSD(discountedPrice!)}
          </span>
        </>
      ) : (
        <span
          className={cn(
            'font-extrabold text-green-500 leading-[1.2] bg-green-500/10 px-2 py-1 rounded-md shadow-sm w-fit',
            size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[26px]' : 'text-[22px]',
          )}
        >
          {formatUSD(originalPrice)}
        </span>
      )}
    </div>
  )
}
