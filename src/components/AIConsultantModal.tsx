import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAiSearch } from '@/hooks/use-ai-search'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIConsultantModalProps {
  isOpen: boolean
  onClose: () => void
  productName?: string
  technicalInfo?: string
}

export function AIConsultantModal({
  isOpen,
  onClose,
  productName,
  technicalInfo,
}: AIConsultantModalProps) {
  const [query, setQuery] = useState('')
  const { search, isLoading, results } = useAiSearch()

  const handleSearch = async () => {
    if (!query.trim()) return
    await search(query, [], { productName, technicalInfo })
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-4xl w-full h-full max-h-[85vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl',
          'p-6 sm:p-10 flex flex-col gap-4',
          'bg-zinc-900/95 backdrop-blur-md border-zinc-800 shadow-2xl shadow-black/50',
          'top-auto bottom-0 translate-y-0 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] fixed sm:left-[50%] sm:translate-x-[-50%]',
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Consultor de IA
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Tire suas dúvidas técnicas, sobre compatibilidade ou prazo de entrega.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 border border-zinc-800/50 rounded-lg p-4 bg-black/20">
          {results?.message ? (
            <div className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed">
              <ReactMarkdown>{results.message}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-zinc-500 text-sm h-full flex flex-col items-center justify-center min-h-[200px] text-center gap-2">
              <MessageCircle className="w-8 h-8 opacity-20" />
              <p>
                Faça uma pergunta sobre o produto para iniciar a conversa com nosso especialista.
              </p>
            </div>
          )}
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 items-end mt-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua dúvida..."
            className="text-lg text-white placeholder:text-zinc-500 bg-zinc-800/50 border-zinc-700 min-h-[60px] resize-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            size="icon"
            className="mb-1 h-[60px] w-[60px] shrink-0 rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {results?.should_show_whatsapp_button && (
          <Button
            className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-semibold py-6 rounded-xl mt-2 transition-colors"
            onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
          >
            Falar com Especialista no WhatsApp
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
