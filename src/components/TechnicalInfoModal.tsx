import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  h1: ({ node, ...props }: any) => (
    <h2 className="text-[1.25rem] font-[600] mt-[1rem] mb-[0.5rem]" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h3 className="text-[1.125rem] font-[600] mt-[0.875rem] mb-[0.5rem]" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h4 className="text-[1rem] font-[600] mt-[0.75rem] mb-[0.5rem]" {...props} />
  ),
  h4: ({ node, ...props }: any) => (
    <h5 className="text-[0.875rem] font-[600] mt-[0.5rem] mb-[0.5rem]" {...props} />
  ),
  h5: ({ node, ...props }: any) => (
    <h6 className="text-[0.875rem] font-[600] mt-[0.5rem] mb-[0.5rem]" {...props} />
  ),
  h6: ({ node, ...props }: any) => (
    <h6 className="text-[0.875rem] font-[600] mt-[0.5rem] mb-[0.5rem]" {...props} />
  ),
  p: ({ node, ...props }: any) => <p className="my-[0.5rem] leading-[1.6]" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="pl-[1.5rem] my-[0.5rem] list-disc" {...props} />,
  ol: ({ node, ...props }: any) => (
    <ol className="pl-[1.5rem] my-[0.5rem] list-decimal" {...props} />
  ),
  li: ({ node, ...props }: any) => <li className="my-[0.25rem] leading-[1.5]" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-[700]" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic" {...props} />,
  code: ({ node, className, children, ...props }: any) => (
    <code
      className={cn(
        'bg-muted px-[0.5rem] py-[0.25rem] font-mono text-[0.875rem] rounded-[0.25rem]',
        className,
      )}
      {...props}
    >
      {children}
    </code>
  ),
  br: ({ node, ...props }: any) => <br {...props} />,
}

export function TechnicalInfoModal({ isOpen, onClose, technicalInfo }: TechnicalInfoModalProps) {
  if (!technicalInfo) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Informações Técnicas</DialogTitle>
          <DialogDescription className="sr-only">
            Especificações técnicas detalhadas do produto
          </DialogDescription>
        </DialogHeader>
        <div
          className="mt-2 text-foreground/90 text-sm md:text-base leading-relaxed"
          style={{
            maxHeight: '600px',
            overflowY: 'auto',
            padding: '1.5rem',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
        >
          <ReactMarkdown
            components={markdownComponents}
            skipHtml={false}
            allowedElements={[
              'h1',
              'h2',
              'h3',
              'h4',
              'h5',
              'h6',
              'p',
              'ul',
              'ol',
              'li',
              'strong',
              'em',
              'code',
              'br',
            ]}
            disallowedElements={['script', 'img', 'a']}
            children={technicalInfo}
          />
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
