import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, Bot, MessageSquare, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAiSearch } from '@/hooks/use-ai-search'
import { cn } from '@/lib/utils'
import { ProductCard } from '@/components/ProductCard'

const renderMarkdown = (text: string, theme: string = 'light') => {
  if (!text) return null
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^[a-z]+\n/, '')
      return (
        <div
          key={i}
          className={cn(
            'my-3 p-4 rounded-xl overflow-x-auto font-mono text-[13px] whitespace-pre-wrap border shadow-inner',
            theme === 'professional-dark'
              ? 'bg-slate-900/50 text-slate-200 border-slate-700'
              : 'bg-black/5 text-foreground/90 border-black/10',
          )}
        >
          {code}
        </div>
      )
    }

    const tableRegex = /(\n(?:\|.*\|\n)+)/g
    const textBlocks = part.split(tableRegex)

    return textBlocks.map((block, bpIdx) => {
      if (block.trim().startsWith('|') && block.trim().endsWith('|')) {
        const rows = block
          .trim()
          .split('\n')
          .map((r) => r.split('|').filter((c) => c.trim() !== ''))

        if (rows.length < 2) return null

        const headerRow = rows[0]
        const dataRows = rows.slice(1).filter((r) => !r.every((c) => c.trim().match(/^[-:]+$/)))

        return (
          <div
            key={`table-${i}-${bpIdx}`}
            className={cn(
              'my-4 rounded-xl border-l-4 border-primary shadow-md overflow-x-auto animate-fade-in',
              theme === 'professional-dark'
                ? 'bg-slate-900/80 border-slate-800'
                : 'bg-gray-50 border-gray-200',
            )}
          >
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead
                className={cn(
                  'text-xs uppercase font-semibold tracking-wider border-b border-border/50',
                  theme === 'professional-dark'
                    ? 'bg-slate-800/50 text-slate-400'
                    : 'bg-gray-100/50 text-gray-500',
                )}
              >
                <tr>
                  {headerRow.map((cell, cIdx) => {
                    if (!cell.trim() && cIdx === 0) return null
                    if (!cell.trim() && cIdx === headerRow.length - 1) return null
                    return (
                      <th key={cIdx} className="px-6 py-4">
                        {cell.trim()}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {dataRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={cn(
                      'transition-colors',
                      theme === 'professional-dark'
                        ? 'text-slate-200 hover:bg-slate-800/50'
                        : 'text-foreground hover:bg-black/5',
                    )}
                  >
                    {row.map((cell, cIdx) => {
                      if (!cell.trim() && cIdx === 0 && row.length > 2) return null
                      if (!cell.trim() && cIdx === row.length - 1 && row.length > 2) return null
                      return (
                        <td
                          key={cIdx}
                          className={cn(
                            'px-6 py-3',
                            cIdx <= 1
                              ? 'font-medium text-primary'
                              : 'font-mono text-primary/90 font-medium',
                          )}
                        >
                          {cell.trim()}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      const paragraphs = block.split('\n\n')
      return paragraphs.map((p, j) => {
        if (!p.trim()) return null

        const lines = p.split('\n')
        return (
          <div key={`${i}-${bpIdx}-${j}`} className={j > 0 ? 'mt-3' : ''}>
            {lines.map((line, k) => {
              let content = line
              let isHeading = false
              let headingLevel = 0

              if (content.startsWith('### ')) {
                content = content.replace('### ', '')
                isHeading = true
                headingLevel = 3
              } else if (content.startsWith('## ')) {
                content = content.replace('## ', '')
                isHeading = true
                headingLevel = 2
              } else if (content.startsWith('# ')) {
                content = content.replace('# ', '')
                isHeading = true
                headingLevel = 1
              }

              const tokens = content.split(/(\*\*.*?\*\*)/g)
              const renderedLine: React.ReactNode[] = tokens.map((token, tIdx) => {
                if (token.startsWith('**') && token.endsWith('**')) {
                  return (
                    <strong key={tIdx} className="font-semibold text-foreground">
                      {token.slice(2, -2)}
                    </strong>
                  )
                }

                const words = token.split(
                  /(\b\d+(?:[.,]\d+)?\s*(?:MP|fps|kg|Hz|mm|cm|lb|lbs| polegadas|K|p)\b)/gi,
                )
                if (words.length > 1) {
                  return (
                    <span key={tIdx}>
                      {words.map((w, wIdx) => {
                        if (
                          w.match(
                            /\b\d+(?:[.,]\d+)?\s*(?:MP|fps|kg|Hz|mm|cm|lb|lbs| polegadas|K|p)\b/i,
                          )
                        ) {
                          return (
                            <span key={wIdx} className="font-mono text-primary font-medium">
                              {w}
                            </span>
                          )
                        }
                        return w
                      })}
                    </span>
                  )
                }

                return <span key={tIdx}>{token}</span>
              })

              if (isHeading) {
                const Element = `h${headingLevel}` as any
                return (
                  <Element key={k} className="font-bold text-foreground mt-4 mb-2">
                    {renderedLine}
                  </Element>
                )
              }

              const isListItem = line.trim().startsWith('- ') || /^\d+\.\s/.test(line.trim())
              return (
                <div
                  key={k}
                  className={isListItem ? 'ml-4 mb-1 flex items-start' : 'mb-1 leading-relaxed'}
                >
                  {isListItem && line.trim().startsWith('- ') && (
                    <span className="mr-2 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  )}
                  <span className="flex-1">
                    {isListItem && line.trim().startsWith('- ')
                      ? renderedLine.slice(1)
                      : renderedLine}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })
    })
  })
}

export function ChatInterface() {
  const { search, isLoading, results } = useAiSearch()
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant'
      content: string
      products?: any[]
      showWhatsapp?: boolean
      confidence?: string
      is_intermediate?: boolean
    }>
  >([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const displayConfig = results?.settings?.result_component_config || {}
  const theme = displayConfig.theme || 'light'
  const colsDesktop = displayConfig.columns_desktop || 3
  const forceRenderCards = displayConfig.force_render_cards !== false

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  useEffect(() => {
    scrollToBottom()
    const timeout = setTimeout(scrollToBottom, 150)
    return () => clearTimeout(timeout)
  }, [messages, isLoading, results?.message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    const userQuery = query.trim()
    setQuery('')
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userQuery },
      {
        role: 'assistant',
        content: 'Iniciando busca profunda MY WAY... Analisando modelos e disponibilidade...',
        is_intermediate: true,
      },
    ])

    const res = await search(userQuery, messages)
    if (res) {
      const productsToRender = res.products || []

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.is_intermediate) {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: res.message || res.content,
            products: productsToRender,
            showWhatsapp: res.should_show_whatsapp_button,
            confidence: res.confidence_level,
            is_intermediate: false,
          }
          return newMessages
        }
        return [
          ...prev,
          {
            role: 'assistant',
            content: res.message || res.content,
            products: productsToRender,
            showWhatsapp: res.should_show_whatsapp_button,
            confidence: res.confidence_level,
            is_intermediate: false,
          },
        ]
      })
    }
  }

  useEffect(() => {
    if (results?.is_intermediate && results?.message) {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.is_intermediate) {
          if (lastMsg.content === results.message) return prev
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            ...lastMsg,
            content: results.message,
          }

          setTimeout(() => {
            const containers = document.querySelectorAll('#ai-response-container')
            const container = containers[containers.length - 1]
            if (container) {
              container.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }, 50)

          return newMessages
        }
        return [
          ...prev,
          {
            role: 'assistant',
            content: results.message,
            is_intermediate: true,
          },
        ]
      })
    }
  }, [results?.is_intermediate, results?.message])

  return (
    <Card
      className={cn(
        'w-full max-w-4xl mx-auto flex flex-col h-[800px] shadow-lg border-primary/10 transition-colors',
        theme === 'professional-dark'
          ? 'bg-slate-900 text-slate-100 border-slate-800'
          : 'bg-card text-card-foreground',
      )}
    >
      <CardHeader
        className={cn(
          'border-b px-6 py-4 flex flex-row items-center justify-between space-y-0',
          theme === 'professional-dark' ? 'bg-slate-900 border-slate-800' : 'bg-card',
        )}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-xl">Assistente Especializado</CardTitle>
              <Badge
                variant="outline"
                className="font-bold text-xs tracking-wider text-primary border-primary/20 bg-primary/5 relative z-50"
              >
                IA MY WAY Business
              </Badge>
            </div>
            <CardDescription>Tire suas dúvidas sobre equipamentos audiovisuais</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-6 py-4" ref={scrollRef}>
          <div className="space-y-6 pb-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 mt-20">
                <div
                  className={cn(
                    'p-4 rounded-full',
                    theme === 'professional-dark' ? 'bg-slate-800' : 'bg-primary/5',
                  )}
                >
                  <MessageSquare
                    className={cn(
                      'w-8 h-8',
                      theme === 'professional-dark' ? 'text-slate-400' : 'text-primary/50',
                    )}
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      'font-medium',
                      theme === 'professional-dark' ? 'text-slate-200' : 'text-foreground',
                    )}
                  >
                    Como posso ajudar hoje?
                  </p>
                  <p
                    className={cn(
                      'text-sm',
                      theme === 'professional-dark' ? 'text-slate-400' : 'text-muted-foreground',
                    )}
                  >
                    Pesquise por produtos, especificações ou monte seu projeto.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  id={msg.role === 'assistant' ? 'ai-response-container' : undefined}
                  className={cn(
                    'flex flex-col w-full',
                    msg.role === 'user' ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : theme === 'professional-dark'
                          ? 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                          : 'bg-muted/50 text-foreground rounded-tl-sm border border-border/50',
                    )}
                  >
                    <div className="leading-relaxed space-y-2 break-words">
                      {msg.role === 'assistant' && msg.is_intermediate ? (
                        <div className="flex flex-col space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex space-x-1.5 px-2 py-1">
                              <div
                                className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                                style={{ animationDelay: '0ms' }}
                              />
                              <div
                                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                                style={{ animationDelay: '150ms' }}
                              />
                              <div
                                className="w-2 h-2 bg-primary/80 rounded-full animate-bounce"
                                style={{ animationDelay: '300ms' }}
                              />
                            </div>
                            <span className="animate-pulse font-medium">
                              {msg.content.includes('|')
                                ? 'PROCESSANDO DADOS TÉCNICOS MY WAY...'
                                : msg.content.replace(/my way/gi, 'MY WAY')}
                            </span>
                          </div>
                          {msg.content.includes('|') && (
                            <div className="mt-2">
                              {renderMarkdown(msg.content.replace(/my way/gi, 'MY WAY'), theme)}
                            </div>
                          )}
                        </div>
                      ) : msg.role === 'assistant' ? (
                        renderMarkdown(msg.content.replace(/my way/gi, 'MY WAY'), theme)
                      ) : (
                        msg.content.replace(/my way/gi, 'MY WAY')
                      )}
                    </div>
                  </div>

                  {msg.role === 'assistant' &&
                    !msg.is_intermediate &&
                    msg.products &&
                    msg.products.length > 0 &&
                    forceRenderCards && (
                      <div
                        className={cn(
                          'mt-4 w-full grid gap-4',
                          colsDesktop === 4
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                            : colsDesktop === 2
                              ? 'grid-cols-1 md:grid-cols-2'
                              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
                        )}
                      >
                        {msg.products.map((product: any) => (
                          <div key={product.id} className="h-full">
                            <ProductCard product={product} />
                          </div>
                        ))}
                      </div>
                    )}

                  {msg.role === 'assistant' &&
                    !msg.is_intermediate &&
                    (msg.showWhatsapp || msg.confidence === 'low') && (
                      <div className="mt-4 max-w-[85%]">
                        <Button
                          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                          className="bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md border border-green-600/20 group transition-all duration-300"
                        >
                          <Phone className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                          Falar com Especialista no WhatsApp
                        </Button>
                      </div>
                    )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter
        className={cn(
          'p-4 border-t',
          theme === 'professional-dark' ? 'bg-slate-900 border-slate-800' : 'bg-card/50',
        )}
      >
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquise por câmeras, lentes, iluminação..."
            disabled={isLoading}
            className={cn(
              'flex-1 focus-visible:ring-primary/30 h-12 px-4 rounded-xl shadow-sm',
              theme === 'professional-dark'
                ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400'
                : 'bg-background border-muted-foreground/20',
            )}
          />
          <Button
            type="submit"
            disabled={!query.trim() || isLoading}
            size="icon"
            className={cn(
              'h-12 w-12 rounded-xl transition-all duration-500 shadow-md flex-shrink-0 relative overflow-hidden group',
              'bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]',
              'text-white hover:shadow-lg hover:scale-105 border-0 disabled:opacity-90',
              isLoading && 'animate-pulse',
            )}
            style={{ backgroundImage: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" color="white" />
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <Search
                  className="w-5 h-5 relative z-10 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform text-white"
                  color="white"
                  strokeWidth={2.5}
                />
              </>
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
