import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Bot, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface Props {
  isOpen: boolean
  onClose: () => void
  productName: string
  technicalInfo: string
  currentProductId: string
}

export function AIConsultantModal({
  isOpen,
  onClose,
  productName,
  technicalInfo,
  currentProductId,
}: Props) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg = input
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('call-ai-agent', {
        body: { query: userMsg, session_id: 'prod_' + currentProductId },
      })

      if (error) throw error

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message || data.response || 'Não foi possível obter uma resposta.',
        },
      ])
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua pergunta.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col bg-[#011409] border-[#023317] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 border-b border-[#023317] bg-[#011409]">
          <DialogTitle className="text-[#4ade80] flex items-center gap-3 text-xl font-bold tracking-tight">
            <Sparkles className="w-5 h-5 text-[#4ade80]" />
            Engenharia IA
          </DialogTitle>
          <DialogDescription className="text-emerald-100/70 text-sm mt-1">
            Consultoria técnica avançada para {productName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-5" ref={scrollRef}>
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-emerald-100/40 h-full min-h-[200px] gap-4">
                <Bot className="w-12 h-12 opacity-50 text-[#4ade80]" />
                <p className="text-sm max-w-[80%]">
                  Olá! Sou o assistente de engenharia da My Way. Como posso te ajudar com as
                  especificações e integrações deste equipamento hoje?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl p-4 text-[0.95rem] leading-relaxed shadow-sm',
                    msg.role === 'user'
                      ? 'bg-[#044a24] text-white rounded-br-sm'
                      : 'bg-[#022412] border border-[#044a24]/50 text-emerald-50 rounded-bl-sm',
                  )}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose prose-invert prose-emerald max-w-none text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#022412] border border-[#044a24]/50 text-emerald-50 rounded-2xl rounded-bl-sm p-4 text-sm flex items-center gap-3 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4ade80]" />
                  <span className="opacity-80">Analisando especificações...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-[#023317] bg-[#011409]">
          <div className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua dúvida técnica aqui..."
              className="bg-[#022412] border-[#044a24] text-emerald-50 placeholder:text-emerald-100/30 h-14 pl-5 pr-14 rounded-full focus-visible:ring-[#4ade80]/30 shadow-inner text-base"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-2 w-10 h-10 rounded-full bg-[#4ade80] hover:bg-[#22c55e] text-[#011409] transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
