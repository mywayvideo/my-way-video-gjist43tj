import React from 'react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { ProductCard } from '@/components/ProductCard'
import { Product } from '@/types'

interface ResponseFormatterProps {
  content: string
  products?: Product[]
  stock?: Product[]
  className?: string
}

export function ResponseFormatter({ content, products, stock, className }: ResponseFormatterProps) {
  if (!content) return null

  return (
    <div
      className={cn(
        'flex flex-col w-full text-foreground/90 leading-[1.625] text-sm md:text-base prose prose-invert max-w-none',
        className,
      )}
    >
      <ReactMarkdown
        components={{
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mt-6 mb-4 text-primary" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold mt-4 mb-3 text-primary" {...props} />
          ),
          strong: ({ node, ...props }) => <strong className="font-bold text-primary" {...props} />,
          ul: ({ node, ...props }) => (
            <ul className="ml-6 mt-2 mb-2 list-disc marker:text-primary/70" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="ml-6 mt-2 mb-2 list-decimal marker:text-primary/70" {...props} />
          ),
          li: ({ node, ...props }) => <li className="mb-2" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary pl-4 ml-0 my-4 text-muted-foreground"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto font-mono mb-4" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && String(children).indexOf('\n') === -1

            if (isInline) {
              return (
                <code className="bg-muted px-2 py-1 rounded font-mono text-sm" {...props}>
                  {children}
                </code>
              )
            }

            return (
              <code className={cn('font-mono text-sm', className)} {...props}>
                {children}
              </code>
            )
          },
          a: ({ node, ...props }) => (
            <a className="text-primary underline underline-offset-4" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {(stock && stock.length > 0 ? stock : products) &&
        (stock && stock.length > 0 ? stock : products)!.length > 0 && (
          <div className="mt-8 animate-fade-in-up delay-150 not-prose">
            <h3 className="text-xl font-bold text-white/90 pl-3 border-l-4 border-primary mb-6">
              Equipamentos Localizados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(stock && stock.length > 0 ? stock : products)!.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
    </div>
  )
}
