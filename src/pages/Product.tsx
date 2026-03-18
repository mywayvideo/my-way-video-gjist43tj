import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Product as ProductType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useCartStore } from '@/stores/useCartStore'
import { supabase } from '@/lib/supabase/client'
import { fetchUSDRate } from '@/services/awesome-api'
import { toast } from '@/hooks/use-toast'
import {
  ShoppingCart,
  Bot,
  Globe,
  Loader2,
  Sparkles,
  PackageSearch,
  MessageCircle,
  Calculator,
  ChevronRight,
  X,
} from 'lucide-react'
import { performAISearch, AISearchResponse } from '@/services/ai-search'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

export default function Product() {
  const { id } = useParams()
  const { addItem } = useCartStore()
  const [product, setProduct] = useState<ProductType | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AISearchResponse | null>(null)
  const [question, setQuestion] = useState('')
  const [isMetric, setIsMetric] = useState(false)
  const [imgError, setImgError] = useState(false)

  // BRL Pricing State
  const [brlData, setBrlData] = useState<{
    finalBrl: number
    rate: number
    type: string
    val: number
  } | null>(null)
  const [calculatingBrl, setCalculatingBrl] = useState(false)

  useEffect(() => {
    if (!id) return
    setProduct(null)
    setQuestion('')
    setAiResponse(null)
    setAiLoading(false)
    setBrlData(null)
    setImgError(false)

    supabase
      .from('products')
      .select('*, manufacturer:manufacturers(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => data && setProduct(data))
  }, [id])

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !product) return
    setAiLoading(true)
    setAiResponse(null)
    try {
      const { data, error } = await performAISearch(
        `[Contexto do Produto: ${product.name} - SKU: ${product.sku}] ${question}`,
      )
      if (error) throw error
      if (data) setAiResponse(data)
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao consultar o Especialista IA.',
        variant: 'destructive',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handleCalculateBrl = async () => {
    setCalculatingBrl(true)
    try {
      const rate = await fetchUSDRate()
      const { data: pSet } = await supabase.from('pricing_settings').select('*').limit(1).single()

      let finalBrl = 0
      const type = pSet?.spread_type || 'percentage'
      const val = Number(pSet?.spread_value) || 0.1

      if (type === 'fixed') {
        finalBrl = (product?.price_usd || 0) * (rate + val)
      } else {
        finalBrl = (product?.price_usd || 0) * rate * (1 + val)
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

  if (!product)
    return (
      <div className="p-12 text-center text-muted-foreground flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="text-sm text-muted-foreground mb-8 font-mono">
        <Link to="/" className="hover:text-primary transition-colors">
          Catálogo
        </Link>{' '}
        / <span className="text-foreground ml-2">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        <div className="aspect-square bg-gradient-to-br from-white/5 to-transparent rounded-2xl overflow-hidden border border-border/50 p-8 flex items-center justify-center relative group shadow-sm">
          {product.image_url && !imgError ? (
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50 w-full h-full bg-white/5 rounded-xl border border-white/5 border-dashed">
              <PackageSearch className="w-20 h-20 mb-6 opacity-30 drop-shadow-md" />
              <span className="text-sm font-semibold tracking-widest uppercase opacity-70">
                Imagem Indisponível
              </span>
              <span className="text-xs mt-2 opacity-50 text-center max-w-[220px]">
                A foto oficial deste equipamento não foi carregada no sistema.
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-primary font-mono uppercase tracking-widest text-xs font-bold mb-2">
            {product.manufacturer?.name || product.category || 'Geral'}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 leading-tight">
            {product.name}
          </h1>

          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm mb-8 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
              <Globe className="w-32 h-32" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <span className="text-xs font-bold uppercase tracking-widest">Base FOB Miami</span>
              </div>
              <p className="text-4xl lg:text-5xl font-mono font-bold text-foreground drop-shadow-sm">
                <span className="text-2xl text-muted-foreground mr-1">US$</span>
                {(product.price_usd || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

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
                        Estimativa Brasil (BRL)
                      </span>
                      <button
                        onClick={() => setBrlData(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors bg-background/50 rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-3xl font-mono font-bold text-green-500 mb-3 drop-shadow-sm">
                      <span className="text-lg mr-1 opacity-80">R$</span>
                      {brlData.finalBrl.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <div className="text-[10px] text-muted-foreground/80 space-y-1 font-mono leading-relaxed">
                      <p>
                        Cotação Comercial: R$ {brlData.rate.toFixed(3)} | Regra Fiscal:{' '}
                        {brlData.type === 'fixed'
                          ? `+ R$ ${brlData.val.toFixed(2)}`
                          : `+ ${(brlData.val * 100).toFixed(1)}%`}
                      </p>
                      <p className="text-foreground/60 font-sans mt-2 leading-snug border-l-2 border-green-500/50 pl-2">
                        * Referencial dinâmico. Variações cambiais e tributárias aplicam-se no
                        momento do fechamento.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert mb-8 text-foreground/80">
            <MarkdownRenderer
              content={
                product.description ||
                '*Nenhuma descrição detalhada disponível para este equipamento.*'
              }
            />
          </div>

          <Button
            size="lg"
            onClick={() =>
              addItem({
                id: product.id,
                name: product.name,
                price: product.price_usd || 0,
                image_url: product.image_url || undefined,
                quantity: 1,
              })
            }
            className="w-full sm:w-auto h-14 text-base font-semibold shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5"
          >
            <ShoppingCart className="w-5 h-5 mr-3" /> Adicionar ao Projeto
          </Button>

          <div className="mt-12 border-t border-border/50 pt-10">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-foreground">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" /> Consultor IA Técnico
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Dúvidas sobre compatibilidade, carga, conectividade ou fluxo de trabalho? Pergunte ao
              nosso especialista.
            </p>

            <form
              onSubmit={handleAskAI}
              className="flex items-center shadow-sm rounded-full border border-primary/20 bg-background/50 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all mb-6 group"
            >
              <Input
                disabled={aiLoading}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex: Quais codecs suportados? Qual a carga máxima?"
                className="flex-1 border-0 bg-transparent px-6 py-6 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
              />
              <Button
                type="submit"
                disabled={aiLoading || !question.trim()}
                size="icon"
                className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground mr-1.5 md:mr-2 shrink-0"
              >
                {aiLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bot className="w-5 h-5 group-focus-within:scale-110 transition-transform" />
                )}
              </Button>
            </form>

            {aiLoading && (
              <div className="text-center py-8 text-sm text-primary flex flex-col justify-center items-center gap-3 animate-pulse">
                <Bot className="w-8 h-8 opacity-50" />
                <span>Analisando especificações e manuais técnicos...</span>
              </div>
            )}

            {aiResponse && !aiLoading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-card border border-primary/20 rounded-2xl p-6 shadow-lg flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="bg-primary/10 p-2.5 rounded-full ring-1 ring-primary/20">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold flex items-center gap-2">Especialista My Way Video</h3>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                      IA Assistiva
                    </span>
                  </div>
                </div>

                <div className="text-foreground/90 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none relative z-10">
                  <MarkdownRenderer content={aiResponse.message} />
                </div>

                {aiResponse.should_show_whatsapp_button && (
                  <div className="pt-5 mt-3 border-t border-border/50 relative z-10">
                    {aiResponse.whatsapp_reason && (
                      <p className="text-xs text-muted-foreground mb-3 font-medium border-l-2 border-primary/30 pl-2">
                        {aiResponse.whatsapp_reason}
                      </p>
                    )}
                    <Button
                      onClick={() =>
                        window.open(
                          `https://wa.me/17867161170?text=${encodeURIComponent(`[IA Ref] Dúvida sobre ${product.name} (SKU: ${product.sku}): ${question}`)}`,
                          '_blank',
                        )
                      }
                      className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1DA851] text-white shadow-md hover:shadow-xl hover:shadow-[#25D366]/20 transition-all"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> Encaminhar para Engenharia
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-24 max-w-4xl pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Especificações Técnicas</h2>
          <div className="flex items-center gap-3 text-sm bg-muted/50 px-5 py-2.5 rounded-full border border-border shadow-inner">
            <span className={!isMetric ? 'font-bold text-primary' : 'text-muted-foreground'}>
              Imperial
            </span>
            <Switch
              checked={isMetric}
              onCheckedChange={setIsMetric}
              className="data-[state=checked]:bg-primary"
            />
            <span className={isMetric ? 'font-bold text-primary' : 'text-muted-foreground'}>
              Métrico
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden text-sm shadow-sm">
          {[
            { l: 'Marca / Fabricante', v: product.manufacturer?.name },
            { l: 'Código (SKU)', v: product.sku },
            { l: 'Categoria Base', v: product.category },
            { l: 'Classificação NCM', v: product.ncm },
            { l: 'Peso do Equipamento', v: displayWeight(product.weight) },
            { l: 'Dimensões Físicas', v: displayDimensions(product.dimensions) },
          ].map((s, i) => (
            <div
              key={s.l}
              className={`flex flex-col sm:flex-row py-4 px-6 hover:bg-muted/30 transition-colors ${i !== 0 ? 'border-t border-border/30' : ''} ${i % 2 === 0 ? 'bg-background/30' : ''}`}
            >
              <span className="w-64 text-muted-foreground font-medium">{s.l}</span>
              <span className="font-mono text-foreground font-medium mt-1 sm:mt-0">
                {s.v || 'Não Especificado'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
