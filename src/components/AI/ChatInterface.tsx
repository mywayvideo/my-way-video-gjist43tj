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
import { resolveImageUrl } from '@/hooks/use-image-fallback'

export function ChatInterface() {
  const { search, isLoading } = useAiSearch()
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant'
      content: string
      products?: any[]
      showWhatsapp?: boolean
      confidence?: string
    }>
  >([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    const userQuery = query.trim()
    setQuery('')
    setMessages((prev) => [...prev, { role: 'user', content: userQuery }])

    const res = await search(userQuery)
    if (res) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.message || res.content,
          products: res.products,
          showWhatsapp: res.should_show_whatsapp_button,
          confidence: res.confidence_level,
        },
      ])
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto flex flex-col h-[800px] shadow-lg border-primary/10">
      <CardHeader className="border-b bg-card px-6 py-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-xl">Assistente Especializado</CardTitle>
              <Badge
                variant="outline"
                className="font-bold text-xs tracking-wider text-primary border-primary/20"
              >
                IA My Way Business
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
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground mt-20">
                <div className="bg-primary/5 p-4 rounded-full">
                  <MessageSquare className="w-8 h-8 text-primary/50" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Como posso ajudar hoje?</p>
                  <p className="text-sm">
                    Pesquise por produtos, especificações ou monte seu projeto.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted/50 text-foreground rounded-tl-sm border border-border/50',
                    )}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                      {msg.content}
                    </div>
                  </div>

                  {msg.role === 'assistant' && msg.products && msg.products.length > 0 && (
                    <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {msg.products.slice(0, 3).map((product: any) => (
                        <Card
                          key={product.id}
                          className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow group cursor-pointer flex flex-col"
                        >
                          <div className="aspect-square bg-white p-4 flex items-center justify-center relative overflow-hidden group-hover:bg-gray-50 transition-colors">
                            {product.image_url ? (
                              <img
                                src={resolveImageUrl(product.image_url) || ''}
                                alt={product.name}
                                className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-xs">
                                  {product.name.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {(product.stock || 0) > 0 && (
                              <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 shadow-sm border-0 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                Em Estoque
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4 flex-1 flex flex-col">
                            <h4
                              className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors flex-1"
                              title={product.name}
                            >
                              {product.name}
                            </h4>
                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                              <span className="font-bold text-lg text-primary">
                                $
                                {(product.price_usd || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                USD
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.showWhatsapp && msg.confidence === 'low' && (
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

            {isLoading && (
              <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-5 py-4 text-sm border border-border/50 flex items-center space-x-3 shadow-sm">
                  <div className="flex space-x-1.5">
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
                  <span className="text-muted-foreground font-medium">
                    Analisando base de dados e NAB 2026...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t bg-card/50">
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquise por câmeras, lentes, iluminação..."
            disabled={isLoading}
            className="flex-1 bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-12 px-4 rounded-xl shadow-sm"
          />
          <Button
            type="submit"
            disabled={!query.trim() || isLoading}
            size="icon"
            className={cn(
              'h-12 w-12 rounded-xl transition-all duration-500 shadow-md flex-shrink-0 relative overflow-hidden group',
              'text-white hover:shadow-lg hover:scale-105 border-0 disabled:opacity-90',
              '!bg-[linear-gradient(to_right,#3b82f6,#8b5cf6)]',
              isLoading && 'animate-pulse',
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <Search className="w-5 h-5 relative z-10 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform text-white" />
              </>
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
