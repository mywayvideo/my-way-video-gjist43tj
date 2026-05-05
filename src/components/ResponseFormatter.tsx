import React from 'react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { ReferencedProducts } from '@/components/ReferencedProducts'
import { Product } from '@/types'

interface ResponseFormatterProps {
  content: string
  products?: Product[]
  stock?: Product[]
  nabData?: any[]
  intel?: any[]
  referenced_internal_products?: string[]
  className?: string
}

export function ResponseFormatter({
  content,
  products,
  stock,
  className,
  referenced_internal_products,
}: ResponseFormatterProps) {
  if (!content) return null

  const formattedContent = content.replace(/my way/gi, 'MY WAY')

  const parts = formattedContent.split(/(\n(?:\|.*\|\n)+)/g)

  const itemsToRender = stock && stock.length > 0 ? stock : products
  const productIds =
    referenced_internal_products && referenced_internal_products.length > 0
      ? referenced_internal_products
      : itemsToRender?.map((p: any) => p.id)

  return (
    <div
      className={cn(
        'flex flex-col w-full text-foreground/90 leading-[1.625] text-sm md:text-base prose dark:prose-invert max-w-none',
        className,
      )}
    >
      {parts.map((part, i) => {
        if (part.trim().startsWith('|') && part.trim().endsWith('|')) {
          const rows = part
            .trim()
            .split('\n')
            .map((r) => r.split('|').filter((c) => c.trim() !== ''))

          if (rows.length < 2) {
            return (
              <ReactMarkdown key={i} components={markdownComponents}>
                {part}
              </ReactMarkdown>
            )
          }

          const dataRows = rows.slice(1).filter((r) => !r.every((c) => c.trim().match(/^[-:]+$/)))

          return (
            <div
              key={i}
              className="my-4 overflow-x-auto bg-slate-900/80 rounded-xl border-l-4 border-primary p-6 shadow-inner animate-fade-in"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 min-w-[300px]">
                {dataRows.map((row, rIdx) => (
                  <div key={rIdx} className="flex flex-col border-b border-white/10 pb-2">
                    <span className="text-muted-foreground text-sm font-semibold mb-1">
                      {row[0]?.trim() || 'Property'}
                    </span>
                    <span className="font-mono text-primary">
                      {row.slice(1).join(' | ').trim() || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        return (
          <ReactMarkdown key={i} components={markdownComponents}>
            {part}
          </ReactMarkdown>
        )
      })}

      {productIds && productIds.length > 0 && (
        <div className="mt-8 animate-fade-in-up delay-150 not-prose">
          <h3 className="text-xl font-bold text-foreground pl-3 border-l-4 border-primary mb-6">
            Equipamentos Localizados
          </h3>
          <ReferencedProducts ids={productIds} />
        </div>
      )}
    </div>
  )
}

const markdownComponents = {
  h2: ({ node, ...props }: any) => (
    <h2 className="text-2xl font-bold mt-6 mb-4 text-primary" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-xl font-semibold mt-4 mb-3 text-primary" {...props} />
  ),
  strong: ({ node, ...props }: any) => <strong className="font-bold text-primary" {...props} />,
  ul: ({ node, ...props }: any) => (
    <ul className="ml-6 mt-2 mb-2 list-disc marker:text-primary/70" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="ml-6 mt-2 mb-2 list-decimal marker:text-primary/70" {...props} />
  ),
  li: ({ node, ...props }: any) => <li className="mb-2" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="border-l-4 border-primary pl-4 ml-0 my-4 text-muted-foreground"
      {...props}
    />
  ),
  p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props} />,
  pre: ({ node, ...props }: any) => (
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
  a: ({ node, ...props }: any) => (
    <a className="text-primary underline underline-offset-4" {...props} />
  ),
}
