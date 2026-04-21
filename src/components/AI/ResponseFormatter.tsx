import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { useAISettings } from '@/hooks/use-ai-settings'
import { supabase } from '@/lib/supabase/client'
// @ts-expect-error - Assuming react-markdown is installed or provided externally for professional rendering
import ReactMarkdown from 'react-markdown'

interface Product {
  id: string
  name: string
  description?: string
  price_usd?: number
  image_url?: string
}

interface ResponseFormatterProps {
  content: string
  products?: Product[]
  stock?: Product[]
  confidenceLevel?: string
}

export function ResponseFormatter({
  content,
  products = [],
  stock = [],
  confidenceLevel = 'high',
}: ResponseFormatterProps) {
  const displayProducts = stock && stock.length > 0 ? stock : products
  const { settings } = useAISettings()
  const [whatsappNumber, setWhatsappNumber] = useState('1234567890')

  useEffect(() => {
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
      <div className="prose prose-invert max-w-none text-foreground text-base leading-relaxed bg-transparent">
        <ReactMarkdown>{content || ''}</ReactMarkdown>
      </div>

      {displayProducts && displayProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {displayProducts.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-all duration-300 bg-card"
            >
              {product.image_url ? (
                <div className="w-full h-48 bg-muted overflow-hidden relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center relative">
                  <span className="text-muted-foreground text-sm font-medium">Sem imagem</span>
                </div>
              )}
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-lg font-semibold line-clamp-2 leading-tight">
                  {product.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-5 leading-relaxed">
                  {product.description ||
                    'Produto profissional audiovisual. Consulte-nos para mais detalhes técnicos e disponibilidade.'}
                </p>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <span className="text-sm font-medium text-foreground">Preço Estimado</span>
                  <Badge variant="secondary" className="px-3 py-1 font-semibold">
                    {product.price_usd
                      ? `USD ${product.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : 'Consulte'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
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
