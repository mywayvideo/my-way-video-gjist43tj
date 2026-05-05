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
        <ReactMarkdown
          className="prose prose-invert max-w-none whitespace-pre-wrap text-white/90"
          components={{
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto w-full my-6 rounded-lg border border-white/10 bg-white/5">
                <table className="w-full text-sm text-left whitespace-nowrap" {...props} />
              </div>
            ),
            th: ({ node, ...props }) => (
              <th
                className="px-6 py-4 bg-white/5 font-semibold border-b border-white/10"
                {...props}
              />
            ),
            td: ({ node, ...props }) => (
              <td className="px-6 py-3 border-b border-white/5 last:border-0" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
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
