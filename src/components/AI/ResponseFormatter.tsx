import React from 'react'
import ReactMarkdown from 'react-markdown'
import { ProductCard } from '@/components/ProductCard'

interface ResponseFormatterProps {
  content: string
  products?: any[]
  stock?: any[]
  referenced_internal_products?: string[]
  nabData?: any[]
  intel?: any[]
}

export function ResponseFormatter({
  content,
  products,
  stock,
  referenced_internal_products,
  nabData,
  intel,
}: ResponseFormatterProps) {
  let finalProducts = products || []

  // Ensure double-layer filtering is strictly applied here as a final fallback safety net
  if (finalProducts.length === 0 && stock && stock.length > 0) {
    const refs = referenced_internal_products || []

    // Layer 1: Filter by ID
    let filtered = stock.filter((p: any) => refs.includes(p.id))

    // Layer 2: Fallback to text matching
    if (filtered.length === 0 && content) {
      const lowerContent = content.toLowerCase()
      filtered = stock.filter((p: any) => {
        const nameMatch = p.name && lowerContent.includes(p.name.toLowerCase())
        const modelMatch = p.sku && lowerContent.includes(p.sku.toLowerCase())
        return nameMatch || modelMatch
      })
    }

    finalProducts = filtered
  }

  // Deduplicate
  finalProducts = finalProducts.filter(
    (v: any, i: number, a: any[]) => a.findIndex((t) => t.id === v.id) === i,
  )

  return (
    <div className="space-y-6">
      {content && (
        <div className="w-full overflow-x-auto">
          <ReactMarkdown
            className="prose prose-invert max-w-none text-white/90 [&_p]:whitespace-pre-wrap [&_li]:whitespace-normal"
            components={{
              table: ({ node: _node, ...props }: any) => (
                <div className="w-full max-w-full overflow-x-auto my-6 border border-white/10 rounded-lg shadow-sm bg-black/20">
                  <table
                    className="w-full text-sm text-left border-collapse"
                    style={{ minWidth: 'max-content' }}
                    {...props}
                  />
                </div>
              ),
              th: ({ node: _node, ...props }: any) => (
                <th
                  className="px-6 py-4 bg-white/5 font-semibold text-white border-b border-white/10 whitespace-nowrap"
                  {...props}
                />
              ),
              td: ({ node: _node, ...props }: any) => (
                <td className="px-6 py-4 border-b border-white/10 text-white/80" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}

      {finalProducts && finalProducts.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalProducts.map((product: any, index: number) => (
              <React.Fragment key={product.id || index}>
                <ProductCard product={product} />
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
