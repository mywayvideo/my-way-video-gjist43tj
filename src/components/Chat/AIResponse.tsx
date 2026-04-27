import React from 'react'
import ReactMarkdown from 'react-markdown'
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

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getMentionedProducts(text: string, stock: Product[], referencedIds: string[] = []) {
  if (!stock || !Array.isArray(stock)) return []

  const uniqueStock = Array.from(new Map(stock.map((p) => [p.id, p])).values())
  const validRefs = (referencedIds || []).filter((ref) => typeof ref === 'string')
  const lowerText = text ? text.toLowerCase() : ''

  const filtered = uniqueStock.filter((product) => {
    if (validRefs.includes(product.id)) {
      return true
    }

    if (product.sku && typeof product.sku === 'string' && product.sku.trim() !== '') {
      const sku = product.sku.trim()
      const lowerSku = sku.toLowerCase()

      try {
        const exactRegex = new RegExp(`\\b${escapeRegExp(lowerSku)}\\b`, 'i')
        if (exactRegex.test(lowerText)) {
          return true
        }
      } catch (e) {
        if (lowerText.includes(lowerSku)) {
          return true
        }
      }

      if (sku.includes('-')) {
        const parts = sku
          .split('-')
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
        if (parts.length >= 2) {
          const firstPart = parts[0].toLowerCase()
          const lastPart = parts[parts.length - 1].toLowerCase()

          if (firstPart && lastPart) {
            const firstIndex = lowerText.indexOf(firstPart)
            if (firstIndex !== -1) {
              const substring = lowerText.substring(
                firstIndex,
                firstIndex + firstPart.length + lastPart.length + 10,
              )
              if (substring.includes(lastPart)) {
                return true
              }
            }
          }
        }
      }
    }

    return false
  })

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
      <div className="max-h-96 overflow-y-auto border rounded-lg bg-muted/10 mb-6 custom-scrollbar">
        <div className="px-10 py-6 max-w-4xl mx-auto">
          <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {text}
          </ReactMarkdown>
        </div>
      </div>

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
