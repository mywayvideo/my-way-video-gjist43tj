import React from 'react'
import { Sparkles, CheckCircle2, AlertTriangle, AlertCircle, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'

interface Product {
  id: string
  name: string
  description?: string
  price_usd?: number
  image_url?: string
}

interface AIResult {
  message?: string
  confidence_level?: 'high' | 'medium' | 'low'
  referenced_internal_products?: Product[]
  should_show_whatsapp_button?: boolean
  whatsapp_reason?: string
}

interface AISearchResultsProps {
  isLoading: boolean
  result?: AIResult | null
  error?: string | null
  className?: string
}

export function AISearchResults({ isLoading, result, error, className }: AISearchResultsProps) {
  const { addItem } = useCart()

  if (isLoading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-6',
          className,
        )}
      >
        {/* Animated neural glow background */}
        <div
          className="absolute -left-1/4 -top-1/4 h-full w-full animate-pulse rounded-full bg-blue-500/20 blur-3xl"
          style={{ animationDuration: '4s' }}
        />
        <div
          className="absolute -right-1/4 -bottom-1/4 h-full w-full animate-pulse rounded-full bg-purple-500/20 blur-3xl"
          style={{ animationDuration: '5s', animationDelay: '1s' }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-amber-500/20 blur-3xl"
          style={{ animationDuration: '6s', animationDelay: '2s' }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
              <Sparkles className="h-6 w-6 animate-pulse text-slate-300" />
            </div>
            <p className="animate-pulse bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-sm font-medium text-transparent">
              A IA está analisando o catálogo...
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="h-6 w-2/5 animate-pulse rounded bg-slate-800" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-[90%] animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-[80%] animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-500',
          className,
        )}
      >
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!result) return null

  const confidenceColor =
    result.confidence_level === 'high'
      ? 'text-green-400 bg-green-400/10 border-green-400/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
      : result.confidence_level === 'medium'
        ? 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
        : 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]'

  const formatMessage = (msg: string) => {
    // Simple markdown to HTML for bold text and lists
    const lines = msg.split('\n')
    return lines.map((line, i) => {
      // Bold text
      let formattedLine: React.ReactNode[] | string = line
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g)
        formattedLine = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-semibold text-slate-100">
                {part.slice(2, -2)}
              </strong>
            )
          }
          return <span key={j}>{part}</span>
        })
      }

      return (
        <React.Fragment key={i}>
          {formattedLine}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      )
    })
  }

  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl', className)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">Consultor Técnico IA</h3>
        </div>

        {result.confidence_level && (
          <div
            className={cn(
              'inline-flex items-center space-x-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider w-fit',
              confidenceColor,
            )}
          >
            {result.confidence_level === 'high' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            <span>Confiança: {result.confidence_level}</span>
          </div>
        )}
      </div>

      <div className="prose prose-invert max-w-none">
        <div className="whitespace-pre-wrap leading-relaxed text-slate-300">
          {result.message ? formatMessage(result.message) : ''}
        </div>
      </div>

      {result.referenced_internal_products && result.referenced_internal_products.length > 0 && (
        <div className="mt-8 space-y-4">
          <h4 className="text-sm font-medium uppercase tracking-wider text-slate-500">
            Produtos Recomendados
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.referenced_internal_products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
              >
                <div className="flex items-start space-x-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-16 w-16 rounded-md object-cover bg-white"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-slate-700">
                      <Sparkles className="h-6 w-6 text-slate-500" />
                    </div>
                  )}
                  <div>
                    <h5 className="font-medium text-slate-200 line-clamp-2">{product.name}</h5>
                    {product.price_usd ? (
                      <p className="mt-1 text-lg font-bold text-primary">
                        USD {product.price_usd.toFixed(2)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      addItem({
                        product_id: product.id,
                        quantity: 1,
                        price_usd: product.price_usd || 0,
                      })
                    }
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.should_show_whatsapp_button && (
        <div className="mt-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
          <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
            <div className="text-sm text-green-400">
              <span className="font-semibold block mb-1">Recomendação do Consultor:</span>
              {result.whatsapp_reason ||
                'Este projeto requer análise detalhada por um especialista.'}
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white sm:w-auto shrink-0"
              onClick={() => {
                const text = encodeURIComponent(
                  `Olá! Gostaria de falar com um especialista sobre o seguinte resultado da IA:\n\n${result.message?.substring(0, 150)}...`,
                )
                window.open(`https://wa.me/5511999999999?text=${text}`, '_blank')
              }}
            >
              Falar com Especialista
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
