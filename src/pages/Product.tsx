import { useState, useEffect, useRef } from 'react'
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
import { useCartStore } from '@/stores/useCartStore'
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
} from 'lucide-react'
import { performAISearch, AISearchResponse } from '@/services/ai-search'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { ReferencedProducts } from '@/components/ReferencedProducts'
import { formatPrice, formatPriceBRL } from '@/utils/priceFormatter'
import { ImageWithFallback } from '@/components/ImageWithFallback'

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
  const { addItem } = useCartStore()
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

  // BRL Pricing State
  const [pricingSettings, setPricingSettings] = useState<{
    usd_to_brl: number
    spread_percentage: number
    spread_type: string
  } | null>(null)

  const [brlData, setBrlData] = useState<{
    finalBrl: number
    rate: number
    type: string
    val: number
  } | null>(null)
  const [calculatingBrl, setCalculatingBrl] = useState(false)

  useEffect(() => {
    const fetchSettingsAndUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const role = user?.app_metadata?.role || user?.user_metadata?.role
      setIsAdmin(role === 'admin')

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

    const fetchPricingSettings = async () => {
      try {
        const { data, error } = await supabase.from('exchange_rate').select('*').limit(1).single()
        if (error) throw error

        if (data) {
          setPricingSettings({
            usd_to_brl: Number(data.usd_to_brl) || 0,
            spread_percentage: Number(data.spread_percentage) || 0,
            spread_type: data.spread_type || 'percentage',
          })
        }
      } catch (err) {
        console.error('Failed to fetch pricing settings', err)
      }
    }

    fetchSettingsAndUser()
    fetchPricingSettings()
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!id) return

    // Dynamic Chat Context Management: Reset state on product change (or URL change)
    setProduct(null)
    setQuestion('')
    setMessages([])
    setIsAiLoading(false)
    setBrlData(null)
    setIsTechnicalInfoOpen(false)
    setIsAiChatOpen(false)

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

  const handleCalculateBrl = async () => {
    setCalculatingBrl(true)
    try {
      // Simulate brief delay for UI consistency
      await new Promise((resolve) => setTimeout(resolve, 300))

      let finalBrl = 0
      let rate = pricingSettings?.usd_to_brl || 0
      let type = pricingSettings?.spread_type || 'percentage'
      let val = pricingSettings?.spread_percentage || 0

      if (pricingSettings && product?.price_brl && product.price_brl > 0) {
        let effectiveVal = val
        // Adjust percentage if entered as whole number (e.g. 10 instead of 0.1)
        if (type === 'percentage' && val >= 1) {
          effectiveVal = val / 100
        }

        if (type === 'fixed') {
          finalBrl = product.price_brl * (rate + effectiveVal)
        } else {
          finalBrl = product.price_brl * rate * (1 + effectiveVal)
        }
      } else {
        finalBrl = 0
      }

      setBrlData({ finalBrl, rate, type, val })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível estimar o preço em BRL.',
        variant: 'destructive',
      })
    } finally {
      setCalculatingBrl(false)
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

  const usdPrice = formatPrice(product.price_usd)

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
                      Base FOB Miami
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-4xl lg:text-5xl font-mono font-bold text-foreground drop-shadow-sm',
                      usdPrice.isPlaceholder &&
                        'text-[0.875rem] lg:text-[0.875rem] font-[600] text-foreground italic tracking-[0.05em] uppercase opacity-80 whitespace-nowrap flex items-center gap-1.5 font-sans drop-shadow-none',
                    )}
                  >
                    {usdPrice.isPlaceholder && <HelpCircle className="w-[14px] h-[14px]" />}
                    {usdPrice.text}
                  </p>

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
                    {!brlData ? (
                      <Button
                        variant="secondary"
                        className="w-full justify-between h-12 text-sm bg-muted/50 hover:bg-muted"
                        onClick={handleCalculateBrl}
                        disabled={calculatingBrl}
                      >
                        <span className="flex items-center gap-2 text-foreground font-medium">
                          {calculatingBrl ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Calculator className="w-4 h-4 text-green-500" />
                          )}
                          Estimar Preço Entregue no Brasil
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </Button>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-top-2 bg-gradient-to-r from-green-500/10 to-transparent rounded-xl p-5 border border-green-500/20">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">
                            Estimativa BRL
                          </span>
                          <button
                            onClick={() => setBrlData(null)}
                            className="text-muted-foreground hover:text-foreground transition-colors bg-background/50 rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {(() => {
                          const brlPrice = formatPriceBRL(brlData.finalBrl)
                          return (
                            <p
                              className={cn(
                                'text-3xl font-mono font-bold text-green-500 mb-3 drop-shadow-sm',
                                brlPrice.isPlaceholder &&
                                  'text-[0.875rem] lg:text-[0.875rem] font-[600] text-green-500 italic tracking-[0.05em] uppercase opacity-80 whitespace-nowrap flex items-center gap-1.5 font-sans drop-shadow-none',
                              )}
                            >
                              {brlPrice.isPlaceholder && (
                                <HelpCircle className="w-[14px] h-[14px]" />
                              )}
                              {brlPrice.text}
                            </p>
                          )
                        })()}
                        <p className="text-[10px] text-muted-foreground font-mono leading-relaxed border-l-2 border-green-500/50 pl-2">
                          Referencial dinâmico sujeito a variação cambial.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-3 lg:order-none w-full mb-10 lg:mb-0">
              <Button
                size="lg"
                disabled={product.is_discontinued}
                aria-label={
                  product.is_discontinued
                    ? 'Produto descontinuado. Nao disponivel para adicionar.'
                    : undefined
                }
                onClick={() => {
                  if (!product.is_discontinued) {
                    addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price_usd || 0,
                      image_url: product.image_url || undefined,
                      quantity: 1,
                    })
                  }
                }}
                className={cn(
                  'w-full h-14 text-base font-semibold shadow-lg transition-all',
                  product.is_discontinued
                    ? 'opacity-50 cursor-not-allowed !pointer-events-auto'
                    : 'hover:shadow-primary/20 hover:-translate-y-0.5',
                )}
              >
                <ShoppingCart className="w-5 h-5 mr-3" /> Adicionar ao Projeto
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

                <Button className="w-full mt-6" size="lg" onClick={() => setIsAiChatOpen(true)}>
                  Fazer Pergunta
                </Button>
              </div>
            </div>
          </div>
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
                const showWhatsApp = checkWhatsAppTrigger(msg, product)

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {msg.role === 'ai' && (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">
                        Assistente
                      </span>
                    )}
                    <div
                      className={`p-3 rounded-2xl text-sm leading-[1.5] max-w-[90%] sm:max-w-[85%] shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-background border border-border/60 rounded-tl-sm'
                      }`}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2 opacity-70 font-mono text-[11px]">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" /> Pesquisando...
                        </div>
                      ) : (
                        <>
                          {msg.role === 'user' ? (
                            <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 text-sm">
                              <MarkdownRenderer content={msg.content} />

                              {msg.aiData?.referenced_internal_products &&
                                msg.aiData.referenced_internal_products.length > 0 && (
                                  <div className="mt-4 border-t border-border/50 pt-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                                      Soluções Mencionadas:
                                    </span>
                                    <ReferencedProducts
                                      ids={msg.aiData.referenced_internal_products}
                                      currentProductId={product.id}
                                    />
                                  </div>
                                )}

                              {showWhatsApp && (
                                <div className="mt-4 pt-3 border-t border-border/50">
                                  {msg.aiData?.whatsapp_reason && (
                                    <p className="text-[11px] text-muted-foreground mb-3 font-medium border-l-2 border-primary/40 pl-2">
                                      {msg.aiData.whatsapp_reason}
                                    </p>
                                  )}
                                  <Button
                                    onClick={() =>
                                      window.open(
                                        `https://wa.me/17867161170?text=${encodeURIComponent(`[Engenharia] Dúvida sobre ${product.name} (SKU: ${product.sku}): ${messages[idx - 1]?.content || ''}`)}`,
                                        '_blank',
                                      )
                                    }
                                    className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white shadow-md hover:shadow-[#25D366]/20 transition-all h-10 text-sm font-semibold"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-2" /> Validar com
                                    Engenheiro
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
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
