import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface Product {
  id: string
  name?: string
  model?: string
  sku?: string
  price_usa?: number | string
  price_brl?: number | string
  image_url?: string
  ncm?: string
  [key: string]: any
}

interface SearchResults {
  stock?: Product[]
  referenced_internal_products?: string[]
  [key: string]: any
}

interface Message {
  text?: string
  content?: string
  referenced_internal_products?: string[]
  [key: string]: any
}

interface AIResponseProps {
  message: Message
  search_results: SearchResults
}

export function getMentionedProducts(text: string, stock: Product[], referencedIds: string[] = []) {
  if (!stock || !Array.isArray(stock)) return []

  let filtered: Product[] = []
  const uniqueStock = Array.from(new Map(stock.map((p) => [p.id, p])).values())

  const validRefs = (referencedIds || []).filter((ref) => typeof ref === 'string')

  // Layer 1 (Priority): Filter by exact IDs if provided
  if (validRefs.length > 0) {
    filtered = uniqueStock.filter((p) => validRefs.includes(p.id))
  }

  // Layer 2 (Fallback): Scan the message text for exact matches
  if (filtered.length === 0 && text) {
    const lowerText = text.toLowerCase()

    filtered = uniqueStock.filter((product) => {
      const name = (product.name || '').toLowerCase()
      const model = (product.model || product.sku || '').toLowerCase()

      const hasName = name && lowerText.includes(name)
      const hasModel = model && lowerText.includes(model)

      return hasName || hasModel
    })

    return filtered.sort((a, b) => {
      const aNameIdx = a.name ? lowerText.indexOf(a.name.toLowerCase()) : -1
      const aModelIdx = a.model || a.sku ? lowerText.indexOf((a.model || a.sku).toLowerCase()) : -1

      const bNameIdx = b.name ? lowerText.indexOf(b.name.toLowerCase()) : -1
      const bModelIdx = b.model || b.sku ? lowerText.indexOf((b.model || b.sku).toLowerCase()) : -1

      const aIdx = Math.min(
        aNameIdx !== -1 ? aNameIdx : Infinity,
        aModelIdx !== -1 ? aModelIdx : Infinity,
      )

      const bIdx = Math.min(
        bNameIdx !== -1 ? bNameIdx : Infinity,
        bModelIdx !== -1 ? bModelIdx : Infinity,
      )

      return aIdx - bIdx
    })
  }

  return filtered
}

export function AIResponse({ message, search_results }: AIResponseProps) {
  const stock = search_results?.stock || []
  const text = message?.text || message?.content || ''
  const referencedIds =
    message?.referenced_internal_products || search_results?.referenced_internal_products || []

  const mentionedProducts = getMentionedProducts(text, stock, referencedIds)

  return (
    <div className="flex flex-col space-y-4">
      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">{text}</div>

      {mentionedProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {mentionedProducts.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name || 'Produto'}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">
                    Sem Imagem
                  </div>
                )}
              </div>
              <CardContent className="p-3 flex flex-col flex-grow">
                <div className="text-xs text-muted-foreground mb-1 line-clamp-1">
                  {product.model || product.sku || 'N/A'}
                </div>
                <h4 className="font-medium text-sm line-clamp-2 mb-2 flex-grow">{product.name}</h4>
                <div className="flex flex-col space-y-1 mt-auto">
                  {product.price_usa && (
                    <span className="text-xs font-semibold text-primary">
                      USD $
                      {Number(product.price_usa).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                  {product.price_brl ? (
                    <span className="text-xs font-semibold text-green-600">
                      BRL R${' '}
                      {Number(product.price_brl).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sob Consulta</span>
                  )}
                  {product.ncm && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      NCM: {product.ncm}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
