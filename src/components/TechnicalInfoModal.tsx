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
  h1: ({ node, ...props }: any) => <h1 className="text-[1.5rem] font-[700] mt-[1rem]" {...props} />,
  h2: ({ node, ...props }: any) => (
    <h2 className="text-[1.25rem] font-[600] mt-[0.875rem]" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-[1.125rem] font-[600] mt-[0.75rem]" {...props} />
  ),
  strong: ({ node, ...props }: any) => <strong className="font-[600]" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="pl-[1.5rem] my-[0.5rem] list-disc" {...props} />,
  ol: ({ node, ...props }: any) => (
    <ol className="pl-[1.5rem] my-[0.5rem] list-decimal" {...props} />
  ),
  li: ({ node, ...props }: any) => <li className="my-[0.25rem]" {...props} />,
  p: ({ node, ...props }: any) => <p className="my-[0.5rem]" {...props} />,
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '')
    const isInline = !match && String(children).indexOf('\n') === -1

    if (isInline) {
      return (
        <code className="bg-muted px-[0.5rem] py-[0.25rem] font-mono text-[0.875rem]" {...props}>
          {children}
        </code>
      )
    }

    return (
      <code
        className={cn('bg-muted px-[0.5rem] py-[0.25rem] font-mono text-[0.875rem]', className)}
        {...props}
      >
        {children}
      </code>
    )
  },
  a: () => null,
  img: () => null,
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
