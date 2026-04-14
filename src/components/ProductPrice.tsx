import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'

export function ProductPrice({
  originalPrice,
  discountedPrice,
  weight,
  discountPercentage,
  ruleName,
  className,
  size,
  currency,
}: {
  originalPrice: number | null | undefined
  discountedPrice?: number | null | undefined
  weight?: number | null | undefined
  discountPercentage?: number | null
  ruleName?: string | null
  className?: string
  size?: 'sm' | 'default' | 'lg'
  currency?: string
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

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(val)
  }

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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px] line-through text-muted-foreground opacity-[0.85] font-medium leading-[1.4]">
              {formatPrice(originalPrice)}
            </span>
            {discountPercentage && discountPercentage > 0 ? (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                {discountPercentage.toFixed(0)}% OFF
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              'font-extrabold text-green-500 leading-[1.2] bg-green-500/10 px-2 py-1 rounded-md shadow-sm w-fit',
              size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[26px]' : 'text-[22px]',
            )}
          >
            {formatPrice(discountedPrice!)}
          </span>
          {originalPrice - discountedPrice! > 0 && (
            <div className="mt-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1">
              <span className="text-[12px] font-medium text-green-600 dark:text-green-400 animate-pulse">
                Economize {formatPrice(originalPrice - discountedPrice!)}
              </span>
              {ruleName && (
                <span className="text-[10px] text-muted-foreground italic">
                  Desconto: {ruleName}
                  {size === 'lg' && ' (Melhor desconto aplicado)'}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <span
          className={cn(
            'font-extrabold text-green-500 leading-[1.2] bg-green-500/10 px-2 py-1 rounded-md shadow-sm w-fit',
            size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[26px]' : 'text-[22px]',
          )}
        >
          {formatPrice(originalPrice)}
        </span>
      )}
    </div>
  )
}
