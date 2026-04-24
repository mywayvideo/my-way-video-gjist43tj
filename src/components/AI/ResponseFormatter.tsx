import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { useAISettings } from '@/hooks/use-ai-settings'
import { supabase } from '@/lib/supabase/client'
// @ts-expect-error - Assuming react-markdown is installed or provided externally for professional rendering
import ReactMarkdown from 'react-markdown'
import { ProductCard } from '@/components/ProductCard'

interface Product {
  id: string
  name: string
  description?: string
  price_usd?: number
  image_url?: string
  [key: string]: any
}

interface ResponseFormatterProps {
  content: string
  products?: Product[]
  stock?: Product[]
  nabData?: any[]
  intel?: any[]
  confidenceLevel?: string
}

export function ResponseFormatter({
  content,
  products = [],
  stock = [],
  confidenceLevel = 'high',
}: ResponseFormatterProps) {
  const displayProductsRaw = products && products.length > 0 ? products : stock
  const displayProducts = []
  const seenIds = new Set()
  for (const p of displayProductsRaw) {
    if (p && p.id && !seenIds.has(p.id)) {
      seenIds.add(p.id)
      displayProducts.push(p)
    }
  }
  const { settings } = useAISettings()
  const [whatsappNumber, setWhatsappNumber] = useState('1234567890')
  const [gridConfig, setGridConfig] = useState({ columns_desktop: 4, columns_mobile: 2 })

  useEffect(() => {
    const fetchGridConfig = async () => {
      const { data } = await supabase
        .from('ai_settings')
        .select('result_component_config')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle()
      if (data?.result_component_config) {
        const conf = data.result_component_config as any
        setGridConfig({
          columns_desktop: conf.columns_desktop || 4,
          columns_mobile: conf.columns_mobile || 2,
        })
      }
    }
    fetchGridConfig()

    const fetchCompanyProfile = async () => {
      // Fetch whatsapp_number from app_settings
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_number')
        .maybeSingle()
      if (data?.setting_value) {
        setWhatsappNumber(data.setting_value)
      } else {
        // Fallback to check company_info if it exists
        const { data: cData } = await supabase
          .from('company_info')
          .select('content')
          .eq('type', 'whatsapp_number')
          .maybeSingle()
        if (cData?.content) setWhatsappNumber(cData.content)
      }
    }
    fetchCompanyProfile()
  }, [])

  let showWhatsapp = false

  if (settings) {
    if (settings.whatsapp_trigger_low_confidence && confidenceLevel === 'low') {
      showWhatsapp = true
    }

    const contentLower = (content || '').toLowerCase()

    if (!showWhatsapp && settings.whatsapp_trigger_purchase_keywords) {
      const purchaseKeywords = [
        'comprar',
        'orçamento',
        'quanto custa',
        'preço',
        'disponível',
        'cotação',
        'desconto',
      ]
      if (purchaseKeywords.some((kw) => contentLower.includes(kw))) {
        showWhatsapp = true
      }
    }

    if (!showWhatsapp && settings.whatsapp_trigger_project_keywords) {
      const projectKeywords = ['projeto', 'integração', 'estúdio', 'instalação', 'solução completa']
      if (projectKeywords.some((kw) => contentLower.includes(kw))) {
        showWhatsapp = true
      }
    }
  }

  const cleanNumber = whatsappNumber.replace(/\D/g, '')
  const defaultNumber = cleanNumber || '1234567890'
  const whatsappLink = `https://wa.me/${defaultNumber}?text=${encodeURIComponent('Olá! Gostaria de falar com um especialista sobre equipamentos audiovisuais.')}`

  return (
    <div className="flex flex-col space-y-8 w-full animate-fade-in">
      {content && (
        <div className="prose prose-invert max-w-none text-foreground text-base leading-relaxed bg-transparent">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}

      {displayProducts && displayProducts.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-8">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      )}

      {showWhatsapp && (
        <div className="mt-8 flex justify-center">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white gap-2" asChild>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5" />
              Falar com Especialista
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
