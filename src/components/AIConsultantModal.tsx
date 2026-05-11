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
import { ProductCard } from '@/components/ProductCard'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'

/* ⬇️ COLAR AQUI — substituir o bloco existente */
import type { Components } from 'react-markdown'

function convertMarkdownTablesToHTML(markdown: string) {
  const lines = markdown.split('\n')
  const output: string[] = []

  let buffer: string[] = []
  let insideTable = false

  const flushTable = () => {
    if (buffer.length < 1) return

    // converte markdown → tabela HTML
    const header = buffer[0]
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())

    const body = buffer.slice(1).map((row) =>
      row
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    )

    let html = '<table><thead><tr>'
    header.forEach((h) => (html += `<th>${h}</th>`))
    html += '</tr></thead><tbody>'

    body.forEach((cols) => {
      html += '<tr>'
      cols.forEach((c) => (html += `<td>${c}</td>`))
      html += '</tr>'
    })

    html += '</tbody></table>'

    output.push(html)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    const isRow = line.startsWith('|') && line.endsWith('|') && line.split('|').length >= 3

    if (isRow) {
      insideTable = true
      buffer.push(line)
      continue
    }

    if (insideTable) {
      flushTable()
      buffer = []
      insideTable = false
    }

    output.push(lines[i])
  }

  // última tabela caso termine no EOF
  if (insideTable) flushTable()

  return output.join('\n')
}

export const premiumMarkdownComponents: Components = {
  table: ({ children }) => (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 bg-white border border-gray-300 rounded-lg shadow-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  tbody: ({ children }) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>,
  th: ({ children }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border border-gray-300"
      scope="col"
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-6 py-4 text-sm text-gray-900 border border-gray-300">{children}</td>
  ),
  tr: ({ children }) => <tr className="hover:bg-gray-50">{children}</tr>,
  // Componentes adicionais para um visual premium
  code: ({ children, className, inline }) =>
    !inline ? (
      <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mt-4 mb-4">
        <code className={`text-sm ${className || ''}`}>{children}</code>
      </pre>
    ) : (
      <code className="bg-gray-100 text-gray-900 px-2 py-1 rounded text-sm font-mono">
        {children}
      </code>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 bg-gray-50 pl-4 py-2 italic text-gray-700 my-4">
      {children}
    </blockquote>
  ),
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    clearResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleWhatsAppClick = async () => {
    let whatsappNumber = '17867161170'
    try {
      const fetchSettings = supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'company_whatsapp')
        .single()
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 1500),
      )
      const response = (await Promise.race([fetchSettings, timeout])) as any
      if (response && !response.error && response.data?.setting_value) {
        whatsappNumber = response.data.setting_value
      }
    } catch {
      // Fallback
    }
    window.open('https://wa.me/' + whatsappNumber.replace(/\D/g, ''), '_blank')
  }

  const htmlRaw = convertMarkdownTablesToHTML(results?.message || '')

  const html = htmlRaw
    .replace(
      /<table([^>]*)>/g,
      '<table$1 style="min-width:max-content;font-size:0.8rem;border-collapse:collapse;white-space:nowrap;">',
    )
    .replace(
      /<th>/g,
      '<th style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;font-size:0.8rem;">',
    )
    .replace(
      /<td>/g,
      '<td style="padding:6px 10px;border:1px solid #ddd;font-size:0.8rem;white-space:nowrap;">',
    )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[95vw] translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#05381a]/80 bg-[#021307]/98 p-4 flex flex-col backdrop-blur-md shadow-2xl duration-200 sm:rounded-2xl sm:max-w-4xl h-[92vh] sm:h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-green-400 text-xl flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-400" />
            Engenharia IA {productName ? `- ${productName}` : ''}
          </DialogTitle>
          <DialogDescription className="text-green-100/60 text-lg">
            Tire suas dúvidas técnicas, sobre compatibilidade ou prazo de entrega.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 border border-green-800/40 rounded-lg p-4 bg-black/20">
          {results?.is_intermediate && (
            <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-zinc-900/50 border border-orange-500/30 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-orange-500 font-bold text-sm tracking-wider">
                PROCESSANDO BUSCA PROFUNDA MY WAY...
              </span>
            </div>
          )}

          {results?.message ? (
            <div className="flex flex-col gap-6">
              <div className="text-white/90 text-base space-y-4 leading-normal overflow-x-auto">
                {html.includes('<table>') ? (
                  <div className="w-full overflow-x-auto">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: html,
                      }}
                    />
                  </div>
                ) : (
                  <ReactMarkdown components={premiumMarkdownComponents}>
                    {results?.message || ''}
                  </ReactMarkdown>
                )}
              </div>
              {results.products &&
                results.products.filter((p: any) => {
                  const pid = String(p?.id || '')
                    .toLowerCase()
                    .trim()
                  const currentId = String(currentProductId || '')
                    .toLowerCase()
                    .trim()
                  return pid !== currentId
                }).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pb-4">
                    {results.products
                      .filter(
                        (p: any) =>
                          String(p?.id || '')
                            .toLowerCase()
                            .trim() !==
                          String(currentProductId || '')
                            .toLowerCase()
                            .trim(),
                      )
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
            <div className="text-green-100/30 text-lg h-full flex flex-col items-center justify-center min-h-[200px] text-center gap-2">
              <MessageCircle className="w-8 h-8 opacity-20" />
              <p>
                Olá {userName}, como posso ajudar com sua dúvida sobre o {productName || 'produto'}?
              </p>
            </div>
          )}
          {isLoading && !results?.is_intermediate && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 items-end mt-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua dúvida..."
            className="text-lg text-white placeholder:text-green-100/30 bg-[#03200c]/60 border-green-900/50 min-h-[60px] resize-none focus-visible:ring-1 focus-visible:ring-green-500"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            size="icon"
            className="mb-1 h-[60px] w-[60px] shrink-0 rounded-xl bg-[#0a5c2b] hover:bg-green-700 transition-colors duration-200"
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
