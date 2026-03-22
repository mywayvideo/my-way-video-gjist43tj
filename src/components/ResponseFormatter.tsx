import React from 'react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface ResponseFormatterProps {
  content: string
  className?: string
}

export function ResponseFormatter({ content, className }: ResponseFormatterProps) {
  if (!content) return null

  return (
    <div
      className={cn(
        'flex flex-col w-full text-foreground/90 leading-[1.625] text-sm md:text-base',
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
    </div>
  )
}
