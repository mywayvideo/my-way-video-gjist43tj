import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import ProductCard from '@/components/ProductCard'
import { cn } from '@/lib/utils'

interface ResponseFormatterProps {
  content: string
  products: any[]
  stock: any[]
  referenced_internal_products: string[]
}

const ResponseFormatter: React.FC<ResponseFormatterProps> = ({
  content,
  products,
  stock,
  referenced_internal_products,
}) => {
  const finalProducts = useMemo(() => {
    let prods: any[] = []
    if (products.length > 0) {
      prods = products
    } else {
      prods = stock.filter((item: any) => referenced_internal_products.includes(item.id))
    }

    // Remove duplicates by ID
    const unique = new Map<string, any>()
    prods.forEach((p) => {
      if (p.id) {
        unique.set(p.id, p)
      }
    })
    return Array.from(unique.values())
  }, [products, stock, referenced_internal_products])

  return (
    <div className="space-y-8 w-full">
      {content && (
        <div className="prose prose-invert max-w-none text-lg leading-relaxed text-white/90">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-xl font-bold mt-8 mb-4 text-zinc-200 tracking-tight border-b border-white/5 pb-2">
                  {children}
                </h2>
              ),
              p: ({ children }) => (
                <p className="mb-4 last:mb-0 text-zinc-300 leading-relaxed">{children}</p>
              ),
              li: ({ children }) => (
                <li className="mb-1 leading-normal text-zinc-300">{children}</li>
              ),
              ul: ({ children }) => (
                <ul className="list-disc ml-6 space-y-2 my-4 text-zinc-300">{children}</ul>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
      {finalProducts.length > 0 && (
        <div>
          <h3 className="uppercase text-sm font-bold tracking-widest text-zinc-500 mb-6">
            PRODUTOS RELACIONADOS MY WAY
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalProducts.map((product, index) => (
              <ProductCard key={product.id || index} {...product} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResponseFormatter
