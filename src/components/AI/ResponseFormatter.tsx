import React, { useMemo } from 'react'
import { ProductCard } from '@/components/ProductCard'

interface ResponseFormatterProps {
  content: string
  products?: any[]
  stock?: any[]
  referenced_internal_products?: string[] | any[]
  nabData?: any[]
  intel?: any[]
}

export function ResponseFormatter({
  content,
  stock = [],
  referenced_internal_products = [],
}: ResponseFormatterProps) {
  const filteredProducts = useMemo(() => {
    const stockArray = Array.isArray(stock) ? stock : []
    const refArray = Array.isArray(referenced_internal_products) ? referenced_internal_products : []

    if (stockArray.length === 0) return []

    // 1. Data Parsing: Extract referenced IDs safely handling both strings and objects
    const refIds = refArray
      .map((ref: any) => (typeof ref === 'string' ? ref : ref?.id))
      .filter(Boolean)

    // 2. Layer 1 (Priority): Filter stock array by referenced IDs
    let matched = stockArray.filter((p: any) => refIds.includes(p.id))

    // 3. Layer 2 (Fallback): If Layer 1 is empty, scan message text for exact case-insensitive matches
    if (matched.length === 0 && content) {
      const lowerContent = String(content).toLowerCase()
      matched = stockArray.filter((p: any) => {
        const matchName = p.name && lowerContent.includes(String(p.name).toLowerCase())
        const matchSku = p.sku && lowerContent.includes(String(p.sku).toLowerCase())
        const matchModel = p.model && lowerContent.includes(String(p.model).toLowerCase())
        return matchName || matchSku || matchModel
      })
    }

    // 4. Final List: Combine results and remove duplicates
    const uniqueProducts = Array.from(new Map(matched.map((p: any) => [p.id, p])).values())

    return uniqueProducts
  }, [stock, referenced_internal_products, content])

  const formatMarkdown = (text: string) => {
    if (!text) return null

    const paragraphs = text.split('\n\n')

    return paragraphs.map((paragraph, idx) => {
      const lines = paragraph.split('\n')
      return (
        <p key={idx} className="mb-4 text-white/90 whitespace-pre-wrap">
          {lines.map((line, lineIdx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g)
            return (
              <React.Fragment key={lineIdx}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={pIdx} className="font-bold text-white">
                        {part.slice(2, -2)}
                      </strong>
                    )
                  }
                  return part
                })}
                {lineIdx < lines.length - 1 && <br />}
              </React.Fragment>
            )
          })}
        </p>
      )
    })
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-base md:text-lg leading-relaxed">{formatMarkdown(content)}</div>

      {/* 5. Rendering: Map ONLY this final filtered list to the existing ProductCard components */}
      {filteredProducts.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
