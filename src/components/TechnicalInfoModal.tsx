import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface TechnicalInfoModalProps {
  isOpen: boolean
  onClose: () => void
  technicalInfo: string
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
}

export function TechnicalInfoModal({ isOpen, onClose, technicalInfo }: TechnicalInfoModalProps) {
  if (!technicalInfo) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Informações Técnicas</DialogTitle>
        </DialogHeader>
        <div className="mt-2 text-foreground/90 text-sm md:text-base leading-relaxed">
          <ReactMarkdown components={markdownComponents}>{technicalInfo}</ReactMarkdown>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
