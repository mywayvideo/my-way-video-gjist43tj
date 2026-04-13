import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { Product as ProductType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCart } from '@/hooks/useCart'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { TechnicalInfoModal } from '@/components/TechnicalInfoModal'
import {
  ShoppingCart,
  Bot,
  Globe,
  Loader2,
  Sparkles,
  MessageCircle,
  Calculator,
  ChevronRight,
  X,
  Send,
  Info,
  HelpCircle,
  ChevronLeft,
  Heart,
} from 'lucide-react'
import { performAISearch, AISearchResponse } from '@/services/ai-search'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { ReferencedProducts } from '@/components/ReferencedProducts'
import { AISearchResults } from '@/components/AISearchResults'
import { formatPrice, formatPriceBRL } from '@/utils/priceFormatter'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { ProductPrice } from '@/components/ProductPrice'
import { useProductDiscount } from '@/hooks/useProductDiscount'
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime'
import { useFavorites } from '@/hooks/useFavorites'
import { useHeartAnimation } from '@/hooks/useHeartAnimation'
import { useAuthState } from '@/hooks/useAuthState'
import { ProductCard } from '@/components/ProductCard'

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  aiData?: AISearchResponse
  isLoading?: boolean
}

const formatNCM = (ncm?: string | number | null) => {
  if (ncm === null || ncm === undefined) return ''
  const str = String(ncm).trim()
  if (!str) return ''

  const digits = str.replace(/\D/g, '')
  if (!digits) return str

  const p1 = digits.slice(0, 4)
  const p2 = digits.slice(4, 6)
  const p3 = digits.slice(6, 8)

  let formatted = p1
  if (p2) formatted += '.' + p2
  if (p3) formatted += '.' + p3

  return formatted
}

const markdownComponents = {
  h2: ({ node, ...props }: any) => (
    <h2 className="text-2xl font-bold mt-6 mb-4 text-primary" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-xl font-semibold mt-4 mb-3 text-primary" {...props} />
  ),
  strong: ({ node, ...props }: any) => <strong className="font-bold text-primary" {...props} />,
  ul: ({ node, ...props }: any) => (
    <ul className="ml-6 mt-2 mb-2 list-disc marker:text-primary/70" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="ml-6 mt-2 mb-2 list-decimal marker:text-primary/70" {...props} />
  ),
  li: ({ node, ...props }: any) => <li className="mb-2" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="border-l-4 border-primary pl-4 ml-0 my-4 text-muted-foreground"
      {...props}
    />
  ),
  p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props} />,
  pre: ({ node, ...props }: any) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto font-mono mb-4" {...props} />
  ),
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '')
    const isInline = !match && String(children).indexOf('\n') === -1

    if (isInline) {
      return (
        <code className="bg-muted px-2 py-1 rounded font-mono text-sm" {...props}>
          {children}
        </code>
      )
    }

    return (
      <code className={cn('font-mono text-sm', className)} {...props}>
        {children}
      </code>
    )
  },
}

export default function Product() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [product, setProduct] = useState<(ProductType & { technical_info?: string | null }) | null>(
    null,
  )

  // Chat State
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isAiChatOpen, setIsAiChatOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [isMetric, setIsMetric] = useState(false)
  const [isTechnicalInfoOpen, setIsTechnicalInfoOpen] = useState(false)

  // Admin & Settings State
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPriceCost, setShowPriceCost] = useState(false)

  // Related Products State
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [hasFetchedRelated, setHasFetchedRelated] = useState(false)

  // BRL Pricing Modal State
  const [isBrlModalOpen, setIsBrlModalOpen] = useState(false)

  const { favorites, addFavorite, removeFavorite } = useFavorites()
  const [favLoading, setFavLoading] = useState(false)

  // Use state or derived state for isFavorite so it reacts to changes
  const isProductFavorite = product ? favorites.includes(product.id) : false
  const { isAnimating, triggerAnimation } = useHeartAnimation()
  const { user: authUser, isLoading: isAuthLoading } = useAuthState()

  const { discountedPrice, discountPercentage, ruleName } = useProductDiscount(product)

  const effectiveDiscountPercentage = discountPercentage || 0

  const {
    pricePerKg,
    percentageValue,
    additionalWeightKg,
    isLoading,
    error: settingsError,
  } = useAppSettingsRealtime()

  useEffect(() => {
    console.log('App settings updated:', { pricePerKg, percentageValue, additionalWeightKg })
  }, [pricePerKg, percentageValue, additionalWeightKg])

  const [exchangeRate, setExchangeRate] = useState<number>(0)

  useEffect(() => {
    const fetchExchange = async () => {
      const { data } = await supabase
        .from('price_settings')
        .select('exchange_rate, exchange_spread')
        .limit(1)
        .maybeSingle()
      if (data) {
        setExchangeRate((data.exchange_rate || 0) + (data.exchange_spread || 0))
      }
    }
    fetchExchange()
  }, [])

  const calculatePriceBRL = useCallback(
    (prod: { price_usd: number; weight_lb: number }) => {
      if (!prod.price_usd || exchangeRate === 0) return null

      const weight_kg = prod.weight_lb / 2.204
      const total_weight_kg = weight_kg + additionalWeightKg
      const freight_usd = total_weight_kg * pricePerKg
      const percentage_charge = (prod.price_usd * percentageValue) / 100
      const total_usd = prod.price_usd + freight_usd + percentage_charge

      const total_brl = total_usd * exchangeRate
      const freight_brl = freight_usd * exchangeRate
      const product_brl = prod.price_usd * exchangeRate

      return { total_brl, freight_brl, product_brl }
    },
    [pricePerKg, additionalWeightKg, percentageValue, exchangeRate],
  )

  const priceBrlResult = useMemo(() => {
    if (!product) return null
    const result = calculatePriceBRL({
      price_usd: product.price_usd || 0,
      weight_lb: product.weight || 0,
    })
    if (result) {
      console.log('Price calculated:', result)
    }
    return result
  }, [calculatePriceBRL, product])

  const handleToggleFavorite = async () => {
    if (!product) return
    setFavLoading(true)
    try {
      if (isProductFavorite) {
        await removeFavorite(product.id)
        toast({ title: 'Removido dos favoritos!' })
      } else {
        await addFavorite(product.id)
        triggerAnimation()
        toast({ title: 'Adicionado aos favoritos!' })
      }
    } catch (error) {
      toast({ title: 'Erro ao favoritar produto.', variant: 'destructive' })
    } finally {
      setFavLoading(false)
    }
  }

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'show_price_cost')
        .maybeSingle()

      if (data && data.value === 'true') {
        setShowPriceCost(true)
      } else {
        setShowPriceCost(false)
      }
    }

    fetchSettings()
  }, [])

  useEffect(() => {
    if (!isAuthLoading) {
      const role = authUser?.app_metadata?.role || authUser?.user_metadata?.role
      setIsAdmin(role === 'admin')
    }
  }, [authUser, isAuthLoading])

  useEffect(() => {
    if (!product) return
    if (hasFetchedRelated) return

    let isMounted = true

    const fetchRelated = async () => {
      setIsLoadingRelated(true)
      try {
        let manualIds = product.manual_related_ids || []
        let aiIds = product.ai_related_ids || []

        if ((!aiIds || aiIds.length === 0) && !product.is_discontinued) {
          const { data, error } = await supabase.functions.invoke('generate-related-products', {
            body: { productId: product.id },
          })

          if (!error && data && data.success && data.ai_related_ids) {
            aiIds = data.ai_related_ids
          }
        }

        const allIds = Array.from(new Set([...manualIds, ...aiIds]))

        if (allIds.length === 0) {
          if (isMounted) {
            setRelatedProducts([])
            setIsLoadingRelated(false)
            setHasFetchedRelated(true)
          }
          return
        }

        const { data: relatedData } = await supabase
          .from('products')
          .select('*, manufacturer:manufacturers(*)')
          .in('id', allIds)
          .eq('is_discontinued', false)

        if (relatedData && isMounted) {
          const manualProducts = relatedData.filter((p: any) => manualIds.includes(p.id))
          const aiProducts = relatedData.filter(
            (p: any) => aiIds.includes(p.id) && !manualIds.includes(p.id),
          )

          let combined = [...manualProducts, ...aiProducts]

          for (let i = combined.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[combined[i], combined[j]] = [combined[j], combined[i]]
          }

          setRelatedProducts(combined.slice(0, 6))
        }
      } catch (e) {
        console.error('Error fetching related products:', e)
      } finally {
        if (isMounted) {
          setIsLoadingRelated(false)
          setHasFetchedRelated(true)
        }
      }
    }

    fetchRelated()

    return () => {
      isMounted = false
    }
  }, [product, hasFetchedRelated])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!id) return

    // Dynamic Chat Context Management: Reset state on product change (or URL change)
    setProduct(null)
    setQuestion('')
    setMessages([])
    setIsAiLoading(false)
    setIsBrlModalOpen(false)
    setIsTechnicalInfoOpen(false)
    setIsAiChatOpen(false)
    setRelatedProducts([])
    setHasFetchedRelated(false)
    setIsLoadingRelated(false)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    supabase
      .from('products')
      .select('*, manufacturer:manufacturers(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => data && setProduct(data as any))

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [id, location.pathname, location.search])

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !product || isAiLoading) return

    const userQ = question.trim()
    setQuestion('')
    setIsAiLoading(true)

    const newMessageId = Date.now().toString()
    const aiMessageId = `ai-${newMessageId}`

    setMessages((prev) => [
      ...prev,
      { id: `u-${newMessageId}`, role: 'user', content: userQ },
      { id: aiMessageId, role: 'ai', content: '', isLoading: true },
    ])

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const { data, error } = await performAISearch(
        `[Contexto do Produto Atual: ${product.name} - SKU: ${product.sku}] Pergunta: ${userQ}`,
        abortControllerRef.current.signal,
      )

      if (error) throw error

      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: data.message, aiData: data, isLoading: false }
              : m,
          ),
        )
      }
    } catch (err: any) {
      if (err.message === 'Aborted') return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: 'Ocorreu um erro ao consultar o especialista. Tente novamente.',
                isLoading: false,
              }
            : m,
        ),
      )
      toast({
        title: 'Erro',
        description: 'Falha ao comunicar com o Assistente.',
        variant: 'destructive',
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  const displayWeight = (w: number | null) => {
    if (w === null || w === undefined) return null
    if (isMetric) return `${(w * 0.453592).toFixed(2)} kg`
    return `${w} lb`
  }

  const displayDimensions = (d: string | null) => {
    if (!d) return null
    if (isMetric) return d.replace(/\d+(\.\d+)?/g, (m) => (parseFloat(m) * 2.54).toFixed(1)) + ' cm'
    return `${d} in`
  }

  const checkWhatsAppTrigger = (msg: Message, currentProduct: ProductType) => {
    if (!msg.aiData) return false
    const d = msg.aiData

    if (d.should_show_whatsapp_button) return true
    if (d.confidence_level === 'low') return true

    if (
      d.used_web_search &&
      (!d.referenced_internal_products || d.referenced_internal_products.length === 0)
    )
      return true

    const contentLower = msg.content.toLowerCase()
    if (
      contentLower.includes('não encontrei') ||
      contentLower.includes('consulte o fabricante') ||
      contentLower.includes('não foi possível confirmar')
    ) {
      return true
    }

    const catLower = (currentProduct.category || '').toLowerCase()
    if (
      catLower.includes('cinema') ||
      catLower.includes('broadcast') ||
      catLower.includes('workflow')
    ) {
      return true
    }

    return false
  }

  if (!product)
    return (
      <div className="p-12 text-center text-muted-foreground flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )

  return (
    <>
      <div className="container mx-auto px-4 py-8 animate-fade-in pb-24">
        <div className="text-sm text-muted-foreground mb-8 font-mono">
          <Link to="/" className="hover:text-primary transition-colors">
            Catálogo
          </Link>{' '}
          / <span className="text-foreground ml-2">{product.name}</span>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="contents lg:block lg:space-y-8">
            <div className="order-1 lg:order-none mb-8 lg:mb-0">
              <div className="aspect-square bg-gradient-to-br from-white/5 to-transparent rounded-2xl overflow-hidden border border-border/50 p-8 flex items-center justify-center relative group shadow-sm">
                <ImageWithFallback
                  src={product.image_url}
                  alt={product.name}
                  productId={product.id}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-2xl"
                />

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggleFavorite()
                  }}
                  disabled={favLoading}
                  className="absolute top-4 right-4 z-10 p-3 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                  aria-label={
                    isProductFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
                  }
                >
                  <div className="relative flex items-center justify-center">
                    <Heart
                      className={cn(
                        'w-6 h-6 transition-all duration-300 relative z-10',
                        isProductFavorite
                          ? 'fill-red-500 text-red-500'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    />
                    {isAnimating && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
                        <Heart className="w-6 h-6 fill-red-500 text-red-500 animate-ping absolute opacity-75" />
                        <div className="absolute -inset-4 bg-red-500/20 rounded-full animate-pulse blur-sm" />
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>

            <div className="order-4 lg:order-none mb-8 lg:mb-0">
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden text-sm shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
                  <h3 className="font-bold text-foreground">Especificações Base</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={!isMetric ? 'font-bold text-primary' : 'text-muted-foreground'}
                    >
                      IMP
                    </span>
                    <Switch checked={isMetric} onCheckedChange={setIsMetric} className="scale-75" />
                    <span className={isMetric ? 'font-bold text-primary' : 'text-muted-foreground'}>
                      MET
                    </span>
                  </div>
                </div>
                {[
                  ...(product.manufacturer?.name && product.manufacturer.name.trim() !== ''
                    ? [{ l: 'Marca', v: product.manufacturer.name }]
                    : []),
                  ...(product.sku && product.sku.trim() !== ''
                    ? [{ l: 'Código (SKU)', v: product.sku }]
                    : []),
                  ...(product.category && product.category.trim() !== ''
                    ? [{ l: 'Categoria', v: product.category }]
                    : []),
                  ...(product.ncm !== null &&
                  product.ncm !== undefined &&
                  String(product.ncm).trim() !== ''
                    ? [{ l: 'NCM', v: formatNCM(product.ncm) }]
                    : []),
                  ...(product.weight !== null && product.weight !== undefined && product.weight > 0
                    ? [{ l: 'Peso', v: displayWeight(product.weight) }]
                    : []),
                  ...(product.dimensions && product.dimensions.trim() !== ''
                    ? [{ l: 'Dimensões', v: displayDimensions(product.dimensions) }]
                    : []),
                ].map((s, i) => (
                  <div
                    key={s.l}
                    className={`flex justify-between py-3 px-4 hover:bg-muted/30 transition-colors ${i !== 0 ? 'border-t border-border/30' : ''}`}
                  >
                    <span className="text-muted-foreground font-medium">{s.l}</span>
                    <span className="font-mono text-foreground">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="contents lg:flex lg:flex-col">
            <div className="order-2 lg:order-none flex flex-col w-full">
              <span className="text-primary font-mono uppercase tracking-widest text-xs font-bold mb-2">
                {product.manufacturer?.name || product.category || 'Equipamento Profissional'}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight flex items-center gap-3 flex-wrap">
                {product.name}
                {product.is_discontinued && (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wider">
                    DESCONTINUADO
                  </span>
                )}
              </h1>

              <div className="mb-8">
                <div className="text-foreground/90 text-sm md:text-base leading-relaxed">
                  {product.description ? (
                    <ReactMarkdown components={markdownComponents}>
                      {product.description}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">Descrição não disponível.</p>
                  )}
                </div>

                {product.technical_info && product.technical_info.trim() !== '' && (
                  <Button
                    variant="outline"
                    onClick={() => setIsTechnicalInfoOpen(true)}
                    className="mt-6"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Mais Informações
                  </Button>
                )}
              </div>

              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm mb-6 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
                  <Globe className="w-32 h-32" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Preço base usa (USD)
                    </span>
                  </div>

                  <ProductPrice
                    originalPrice={product.price_usd}
                    discountedPrice={discountedPrice}
                    discountPercentage={discountPercentage}
                    ruleName={ruleName}
                    size="lg"
                  />

                  {isAdmin && showPriceCost && (
                    <div className="mt-2 text-[0.875rem] text-muted-foreground font-mono flex items-center gap-1">
                      <span className="font-medium mr-1">Preço de Custo (FOB Miami):</span>
                      {(() => {
                        const costPrice = formatPrice(product.price_cost)
                        return (
                          <span
                            className={cn(
                              costPrice.isPlaceholder
                                ? 'text-[0.875rem] font-[600] text-foreground italic tracking-[0.05em] uppercase opacity-80 flex items-center gap-1 font-sans'
                                : 'text-foreground font-mono',
                            )}
                          >
                            {costPrice.isPlaceholder && (
                              <HelpCircle className="w-[14px] h-[14px]" />
                            )}
                            {costPrice.isPlaceholder ? 'Indisponível' : costPrice.text}
                          </span>
                        )
                      })()}
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-border/50">
                    <Button
                      variant="secondary"
                      className="w-full justify-between h-12 text-sm bg-muted/50 hover:bg-muted"
                      onClick={() => setIsBrlModalOpen(true)}
                      disabled={isLoading}
                    >
                      <span className="flex items-center gap-2 text-foreground font-medium">
                        <Calculator className="w-4 h-4 text-green-500" />
                        Estimar Preço Entregue no Brasil
                      </span>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-3 lg:order-none w-full mb-10 lg:mb-0 flex gap-4">
              <Button
                size="lg"
                disabled={product.is_discontinued || isLoading}
                aria-label={
                  product.is_discontinued
                    ? 'Produto descontinuado. Nao disponivel para adicionar.'
                    : undefined
                }
                onClick={() => {
                  if (!product.is_discontinued) {
                    addToCart(product.id, 1)
                      .then(() => {
                        toast({
                          title: 'Adicionado ao carrinho!',
                          description: `${product.name} adicionado com sucesso.`,
                        })
                      })
                      .catch(() => {
                        toast({
                          variant: 'destructive',
                          title: 'Erro',
                          description: 'Falha ao adicionar ao carrinho.',
                        })
                      })
                  }
                }}
                className={cn(
                  'flex-1 h-14 text-base font-semibold shadow-lg transition-all',
                  product.is_discontinued
                    ? 'opacity-50 cursor-not-allowed !pointer-events-auto'
                    : 'hover:shadow-primary/20 hover:-translate-y-0.5',
                )}
              >
                <ShoppingCart className="w-5 h-5 mr-3" /> Adicionar ao Projeto
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleFavorite}
                disabled={favLoading}
                className={cn(
                  'h-14 w-14 shrink-0 rounded-xl transition-all shadow-sm relative overflow-hidden',
                  isProductFavorite
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : 'hover:bg-muted',
                )}
                aria-label={isProductFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <Heart
                  className={cn(
                    'w-6 h-6 transition-all duration-300 relative z-10',
                    isProductFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
                  )}
                />
                {isAnimating && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
                    <Heart className="w-6 h-6 fill-red-500 text-red-500 animate-ping absolute opacity-75" />
                    <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                  </div>
                )}
              </Button>
            </div>

            <div className="order-5 lg:order-none w-full mt-0 lg:mt-6">
              <div className="bg-secondary border border-border rounded-[1rem] p-6 min-h-[280px] w-full flex flex-col shadow-sm mb-6">
                <div className="flex items-start gap-4">
                  <Sparkles className="w-12 h-12 text-primary shrink-0" />
                  <div>
                    <h3 className="text-[1.25rem] font-semibold text-foreground">
                      Engenharia de IA
                    </h3>
                    <p className="text-[0.875rem] text-muted-foreground mt-1">
                      Faça perguntas técnicas avançadas
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex-1">
                  <p className="text-[0.95rem] leading-[1.6] text-foreground">
                    Utilize nosso assistente de IA para obter respostas detalhadas sobre
                    especificações, compatibilidade, integrações e fluxos de trabalho profissionais
                    do {product.name}.
                  </p>
                </div>

                <Button
                  className="w-full mt-6"
                  size="lg"
                  onClick={() => setIsAiChatOpen(true)}
                  disabled={isLoading}
                >
                  Fazer Pergunta
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Produtos Relacionados Section */}
        <div className="mt-16 border-t border-border/50 pt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Produtos Relacionados
          </h2>

          {isLoadingRelated ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-card shadow-sm h-full"
                >
                  <div className="w-full aspect-square bg-slate-800 animate-pulse rounded-lg" />
                  <div className="flex flex-col flex-1 mt-2">
                    <div className="h-3 bg-slate-800 animate-pulse rounded w-1/3 mb-2" />
                    <div className="h-4 bg-slate-800 animate-pulse rounded w-full mb-1" />
                    <div className="h-4 bg-slate-800 animate-pulse rounded w-2/3 mb-4" />
                    <div className="h-6 bg-slate-800 animate-pulse rounded w-1/2 mt-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-muted/20 rounded-xl border border-border/50">
              <p className="text-muted-foreground">
                Nenhum produto relacionado encontrado no momento.
              </p>
            </div>
          )}
        </div>

        <Dialog open={isAiChatOpen} onOpenChange={setIsAiChatOpen}>
          <DialogContent className="max-w-3xl h-[85vh] flex flex-col sm:rounded-xl p-0 gap-0 overflow-hidden bg-background">
            <DialogHeader className="p-4 border-b border-border/50 bg-muted/20 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <div className="bg-primary/10 p-1.5 rounded-full ring-1 ring-primary/20">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                Engenharia IA - {product.name}
              </DialogTitle>
              <DialogDescription className="sr-only">Chat de IA</DialogDescription>
            </DialogHeader>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col">
              {messages.length === 0 && (
                <div className="m-auto text-center max-w-sm text-muted-foreground opacity-70">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-base">
                    Faça perguntas técnicas avançadas sobre as especificações do {product.name}
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => {
                if (msg.role === 'ai') {
                  const hasError =
                    msg.content === 'Ocorreu um erro ao consultar o especialista. Tente novamente.'
                  const showWhatsApp = checkWhatsAppTrigger(msg, product)
                  return (
                    <div key={msg.id} className="w-full flex flex-col items-start my-2">
                      <AISearchResults
                        isLoading={msg.isLoading || false}
                        result={
                          msg.aiData
                            ? {
                                message: msg.content,
                                confidence_level: msg.aiData.confidence_level,
                                referenced_internal_products: msg.aiData
                                  .referenced_internal_products as any,
                                should_show_whatsapp_button: showWhatsApp,
                                whatsapp_reason: msg.aiData.whatsapp_reason,
                              }
                            : { message: msg.content, should_show_whatsapp_button: showWhatsApp }
                        }
                        error={hasError ? msg.content : null}
                        className="w-full shadow-md"
                      />
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className="flex flex-col items-end gap-1 my-2">
                    <div className="p-3 bg-primary text-primary-foreground rounded-2xl rounded-tr-sm text-sm leading-[1.5] max-w-[90%] sm:max-w-[85%] shadow-sm">
                      <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/10 shrink-0">
              <form
                onSubmit={handleAskAI}
                className="relative group flex items-center shadow-sm rounded-lg overflow-hidden border border-border/50 bg-background focus-within:ring-1 focus-within:ring-primary focus-within:border-transparent transition-all"
              >
                <Input
                  disabled={isAiLoading}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Quais resoluções RAW suportadas?"
                  className="flex-1 border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50 h-12"
                />
                <Button
                  type="submit"
                  disabled={isAiLoading || !question.trim()}
                  size="icon"
                  className="mr-2 h-8 w-8 rounded bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        <TechnicalInfoModal
          isOpen={isTechnicalInfoOpen}
          onClose={() => setIsTechnicalInfoOpen(false)}
          technicalInfo={product.technical_info || ''}
        />

        <Dialog open={isBrlModalOpen} onOpenChange={setIsBrlModalOpen}>
          <DialogContent className="sm:max-w-md bg-background border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-500" />
                Estimativa Entregue no Brasil
              </DialogTitle>
              <DialogDescription>
                Preço final estimado em reais incluindo o frete e a conversão de câmbio
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center justify-center">
              {isLoading || exchangeRate === 0 ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-48 bg-muted animate-pulse rounded" />
                </div>
              ) : priceBrlResult === null ? (
                <div className="flex flex-col items-center text-center gap-2">
                  <HelpCircle className="w-10 h-10 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-lg font-semibold text-foreground uppercase tracking-wider">
                    Preço sob consulta
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Entre em contato para um orçamento detalhado em BRL.
                  </p>
                </div>
              ) : (
                <div className="text-center animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center">
                  {settingsError && (
                    <div className="text-sm font-medium text-destructive mb-4">{settingsError}</div>
                  )}
                  <span className="text-sm font-semibold text-green-500 uppercase tracking-wider block mb-2">
                    Preço Final BRL
                  </span>
                  <p className="text-4xl font-mono font-extrabold text-green-500 drop-shadow-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      priceBrlResult.total_brl,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
                    * Referencial dinâmico sujeito a variação cambial
                  </p>
                </div>
              )}
            </div>

            <div className="mt-2 text-center border-t border-border/30 pt-4">
              <Button onClick={() => setIsBrlModalOpen(false)} variant="outline" className="w-full">
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <button
        onClick={() => {
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1)
          } else {
            navigate('/')
          }
        }}
        aria-label="Voltar para busca anterior"
        className={cn(
          'fixed z-40 flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.15)] backdrop-blur-[8px] transition-all duration-200 ease-out hover:bg-[rgba(0,0,0,0.25)] active:scale-95 active:bg-[rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group animate-in fade-in slide-in-from-left-5 duration-300',
          'bottom-4 left-4 h-12 w-12',
          'md:bottom-5 md:left-5 md:h-[52px] md:w-[52px]',
          'lg:bottom-6 lg:left-6 lg:h-14 lg:w-14',
        )}
      >
        <ChevronLeft className="text-white/80 group-hover:text-white group-hover:opacity-100 transition-opacity w-5 h-5 md:w-[22px] md:h-[22px] lg:w-6 lg:h-6" />
      </button>
    </>
  )
}
