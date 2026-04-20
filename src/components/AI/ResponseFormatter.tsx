import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
}

export function ResponseFormatter({ content, products = [] }: ResponseFormatterProps) {
  return (
    <div className="flex flex-col space-y-8 w-full animate-fade-in">
      <div className="prose prose-invert max-w-none text-foreground text-base leading-relaxed bg-transparent">
        <ReactMarkdown>{content || ''}</ReactMarkdown>
      </div>

      {products && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {products.map((product) => (
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
    </div>
  )
}
