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
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductCard } from '@/components/ProductCard'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'

interface AIConsultantModalProps {
  isOpen: boolean
  onClose: () => void
  productName?: string
  technicalInfo?: string
  currentProductId?: string
}

export function AIConsultantModal({
  isOpen,
  onClose,
  productName,
  technicalInfo,
  currentProductId,
}: AIConsultantModalProps) {
  const [query, setQuery] = useState('')
  const { search, isLoading, results, clearResults } = useAiSearch()
  const { user } = useAuth()

  useEffect(() => {
    if (!isOpen) {
      clearResults()
    }
  }, [isOpen])

  useEffect(() => {
    clearResults()
  }, [currentProductId])

  const userName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    'Usuário'

  const handleSearch = async () => {
    if (!query.trim()) return
    const priorityQuery = productName
      ? '[CONTEXTO PRIORITÁRIO: Produto ' + productName + '] ' + query
      : query
    await search(priorityQuery, [], { productName, technicalInfo, currentProductId })
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const formattedMessage = results?.message
    ? results.message
        .replace(/\n?## /g, '\n\n## ')
        .replace(/\n?(\d+\.)/g, '\n\n$1')
        .replace(/\n?([-*]) /g, '\n\n$1 ')
        .replace(/\n?(\*\*.*?\*\*:)/g, '\n\n$1')
        .trim()
    : ''

  const handleWhatsAppClick = async () => {
    let whatsappNumber = '17867161170'
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'company_whatsapp')
        .single()
      if (data?.setting_value) whatsappNumber = data.setting_value
    } catch (e) {}
    window.open('https://wa.me/' + whatsappNumber.replace(/\D/g, ''), '_blank')
  }

  // Lógica de Status Dinâmico (Tiers)
  const currentStatus =
    Array.isArray(results?.search_metadata?.tiers_active) &&
    results.search_metadata.tiers_active.length > 0
      ? results.search_metadata.tiers_active[results.search_metadata.tiers_active.length - 1]
      : results?.search_metadata?.status || 'PROCESSANDO...'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          // Mobile: Gaveta no fundo (Reset de posicionamento central)
          'fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 z-50 h-[92vh] w-full rounded-t-[32px] border-t border-zinc-800 bg-zinc-900/95 p-4 flex flex-col gap-4 backdrop-blur-md shadow-2xl transition-all duration-300',
          // Desktop: Centralizado nativo (Reset de posicionamento mobile)
          'sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:h-full sm:max-h-[85vh] sm:w-[95vw] sm:max-w-4xl sm:rounded-2xl sm:p-10 sm:border',
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
          {results?.is_intermediate && (
            <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-zinc-800/50 border border-orange-500/30 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-orange-500 font-bold text-[10px] tracking-widest uppercase">
                {currentStatus}
              </span>
            </div>
          )}

          {results?.message ? (
            <div className="flex flex-col gap-6">
              <div className="prose prose-invert max-w-none text-lg leading-relaxed">
                <ReactMarkdown>{formattedMessage}</ReactMarkdown>
              </div>
              {results.products &&
                results.products.filter((p: any) => String(p?.id) !== String(currentProductId))
                  .length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pb-4">
                    {results.products
                      .filter((p: any) => String(p?.id) !== String(currentProductId))
                      .map((product: any) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                  </div>
                )}
              {results?.should_show_whatsapp_button && (
                <Button
                  className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-6 rounded-xl mt-6 flex items-center justify-center gap-3 shadow-lg"
                  onClick={handleWhatsAppClick}
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
                Olá {userName}, como posso ajudar com sua dúvida sobre o {productName || 'produto'}?
              </p>
            </div>
          )}
          {isLoading && !results?.is_intermediate && (
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
            className="text-lg text-white placeholder:text-lg placeholder:text-zinc-500 bg-zinc-800/50 border-zinc-700 min-h-[60px] resize-none focus-visible:ring-1 focus-visible:ring-primary"
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
