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
import { ProductCard } from '@/components/ProductCard'
import { useAuth } from '@/hooks/use-auth'

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
  const { user } = useAuth()

  const userName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    'Usuário'

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
          'w-full h-[90vh] rounded-t-3xl fixed bottom-0 left-0 right-0 translate-y-0 border-t border-zinc-800',
          'sm:max-w-4xl sm:h-full sm:max-h-[85vh] sm:rounded-2xl',
          'p-6 sm:p-10 flex flex-col gap-4',
          'bg-zinc-900/95 backdrop-blur-md shadow-2xl',
          'sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:left-[50%] sm:translate-x-[-50%]',
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Engenharia IA {productName ? `- ${productName}` : ''}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-lg">
            Tire suas dúvidas técnicas, sobre compatibilidade ou prazo de entrega.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 border border-zinc-800/50 rounded-lg p-4 bg-black/20">
          {results?.message ? (
            <div className="flex flex-col gap-6">
              <div className="prose prose-invert max-w-none text-lg leading-relaxed">
                <ReactMarkdown>{results.message}</ReactMarkdown>
              </div>
              {results.products && results.products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 pb-4">
                  {results.products.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {results?.should_show_whatsapp_button && (
                <Button
                  className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-6 rounded-xl mt-4 transition-all flex items-center justify-center gap-3 shadow-lg"
                  onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                >
                  <MessageCircle className="w-6 h-6" />
                  Falar com Especialista no WhatsApp
                </Button>
              )}
            </div>
          ) : (
            <div className="text-zinc-500 text-lg h-full flex flex-col items-center justify-center min-h-[200px] text-center gap-2">
              <MessageCircle className="w-8 h-8 opacity-20" />
              <p>
                Olá {userName}, como posso ajudar com o {productName || 'produto'} hoje?
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
            className="text-lg placeholder:text-lg text-white placeholder:text-zinc-500 bg-zinc-800/50 border-zinc-700 min-h-[60px] resize-none focus-visible:ring-1 focus-visible:ring-primary"
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
      </DialogContent>
    </Dialog>
  )
}
