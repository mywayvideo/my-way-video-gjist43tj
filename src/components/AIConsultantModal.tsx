import React, { useState, useRef, useEffect } from 'react'
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
import { Send, Bot, MessageCircle, Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Link } from 'react-router-dom'

const parseMarkdownToHtml = (text: string | null | undefined): string => {
  if (!text) return ''

  let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Headers
  html = html.replace(
    /^###\s+(.*)$/gm,
    '<h3 class="text-green-400 text-lg font-bold mt-4 mb-2">$1</h3>',
  )
  html = html.replace(
    /^##\s+(.*)$/gm,
    '<h2 class="text-green-400 text-xl font-bold mt-6 mb-3">$1</h2>',
  )
  html = html.replace(
    /^#\s+(.*)$/gm,
    '<h1 class="text-green-400 text-2xl font-bold mt-8 mb-4">$1</h1>',
  )

  // Bold: Process all pairs of ** using a while loop to wrap content
  while (html.includes('**')) {
    const start = html.indexOf('**')
    const end = html.indexOf('**', start + 2)
    if (start !== -1 && end !== -1) {
      html =
        html.substring(0, start) +
        '<strong class="text-white font-bold">' +
        html.substring(start + 2, end) +
        '</strong>' +
        html.substring(end + 2)
    } else {
      break
    }
  }

  // Italics: Convert single asterisks * into <em> using lookbehind/lookahead
  html = html.replace(
    /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
    '<em class="text-green-100/80">$1</em>',
  )

  // Tables and Lists and line breaks
  const lines = html.split('\n')
  const parsedLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('-') || line.startsWith('•')) {
      const content = line.replace(/^[-•]\s*/, '')
      parsedLines.push(`<li class="ml-4 text-white/90">${content}</li>`)
    } else if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)

      if (cells.every((c) => /^[-:]+$/.test(c))) {
        continue
      }

      const cols = cells.length
      const gridStyle = `grid-template-columns: repeat(${cols}, minmax(0, 1fr))`
      let rowHtml = `<div class="grid gap-2 my-2" style="${gridStyle}">`

      cells.forEach((cell) => {
        rowHtml += `<div class="border border-green-800/40 p-2 text-sm text-white/90">${cell}</div>`
      })

      rowHtml += `</div>`
      parsedLines.push(rowHtml)
    } else {
      parsedLines.push(lines[i])
    }
  }

  html = parsedLines.join('\n')
  html = html.replace(/\n/g, '<br />')

  return html
}

interface Product {
  id: string
  name: string
  price_usd?: number
  price_nationalized_sales?: number
  price_nationalized_currency?: string
  image_url?: string
  category?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: Product[]
  should_show_whatsapp_button?: boolean
  tier?: number
}

interface AIConsultantModalProps {
  isOpen: boolean
  onClose: () => void
  productId?: string
  initialQuery?: string
}

export function AIConsultantModal({
  isOpen,
  onClose,
  productId,
  initialQuery,
}: AIConsultantModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [sessionId] = useState(() => crypto.randomUUID())
  const [whatsappNumber, setWhatsappNumber] = useState('17867161170')

  useEffect(() => {
    if (isOpen) {
      const fetchWhatsapp = async () => {
        const { data } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'company_whatsapp')
          .single()

        if (data?.setting_value) {
          setWhatsappNumber(data.setting_value.replace(/\D/g, ''))
        }
      }
      fetchWhatsapp()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      if (initialQuery) {
        setInputValue(initialQuery)
        handleSend(initialQuery)
      } else {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content:
              'Olá! Sou seu consultor técnico de audiovisual da My Way. Como posso ajudar você hoje com seus equipamentos e projetos?',
          },
        ])
      }
    }
  }, [isOpen, messages.length, initialQuery])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  const handleSend = async (overrideQuery?: string) => {
    const query = overrideQuery || inputValue
    if (!query.trim()) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!overrideQuery) setInputValue('')
    setIsLoading(true)

    try {
      const endpoint = productId ? 'execute_ai_search_v2_pp' : 'execute_ai_search_v2'
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          query: userMsg.content,
          session_id: sessionId,
          currentProductId: productId,
          userName: user?.user_metadata?.name || 'Cliente',
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      })

      if (error) throw error

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || 'Desculpe, não consegui processar sua requisição.',
        products: data.products || [],
        should_show_whatsapp_button: data.should_show_whatsapp_button,
        tier: data.tier || 1,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao conectar com o agente de IA.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 gap-0 bg-zinc-950 border-green-900/30 overflow-hidden">
        <DialogHeader className="p-4 border-b border-green-900/30 bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <Bot className="w-5 h-5" /> Consultor IA My Way
            </DialogTitle>
            <DialogDescription className="sr-only">
              Assistente de IA para ajudar com produtos e dúvidas técnicas.
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg p-4 ${msg.role === 'user' ? 'bg-green-600/20 text-green-100' : 'bg-zinc-900 border border-green-900/30'}`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="space-y-4">
                      <div
                        className="text-white/90 text-base leading-normal overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(msg.content || '') }}
                      />

                      {msg.products &&
                        msg.products.filter((p) => p.id !== productId).length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {msg.products
                              .filter((p) => p.id !== productId)
                              .map((product) => (
                                <Link
                                  key={product.id}
                                  to={`/product/${product.id}`}
                                  onClick={onClose}
                                  className="flex flex-col bg-zinc-950 border border-green-900/30 rounded-md p-3 hover:border-green-500/50 transition-colors group"
                                >
                                  <div className="flex items-start gap-3">
                                    {product.image_url ? (
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-16 h-16 object-cover rounded bg-zinc-900"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 bg-zinc-900 rounded flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-green-700" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-green-100 line-clamp-2 group-hover:text-green-400 transition-colors">
                                        {product.name}
                                      </p>
                                      {product.price_usd ? (
                                        <p className="text-xs text-green-500 mt-1 font-semibold">
                                          USD ${product.price_usd.toFixed(2)}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-zinc-500 mt-1">Sob Consulta</p>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                              ))}
                          </div>
                        )}

                      {msg.should_show_whatsapp_button && (
                        <div className="mt-4 pt-4 border-t border-green-900/30">
                          <Button
                            variant="default"
                            className="bg-[#25D366] hover:bg-[#20bd5a] text-white w-full sm:w-auto"
                            onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" /> Falar com Especialista
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 border border-green-900/30 rounded-lg p-4">
                  <div className="flex gap-2 items-center">
                    <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                    <span className="text-sm text-green-400">Processando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-green-900/30 bg-zinc-900/50 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre equipamentos, especificações ou projetos..."
              className="bg-zinc-950 border-green-900/30 text-green-100 focus-visible:ring-green-500/50"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-green-600 hover:bg-green-700 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="mt-2 text-center">
            <p className="text-[10px] text-zinc-500">
              A IA pode cometer erros. Considere verificar informações importantes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
