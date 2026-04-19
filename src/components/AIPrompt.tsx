import { useState, KeyboardEvent, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AIPromptProps {
  onSearch?: (query: string) => void
  onSubmit?: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export function AIPrompt({
  onSearch,
  onSubmit,
  isLoading,
  placeholder = 'Descreva o que você precisa ou faça uma pergunta para a IA...',
  className,
}: AIPromptProps) {
  const [query, setQuery] = useState('')

  const submitAction = onSubmit || onSearch

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    if (query.trim() && !isLoading && submitAction) {
      submitAction(query.trim())
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        'relative flex w-full flex-col shadow-md rounded-2xl bg-background border focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[100px] w-full resize-none border-0 bg-transparent p-4 pr-16 text-base focus-visible:ring-0 shadow-none"
          disabled={isLoading}
        />
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <Button
            type="submit"
            size="icon"
            disabled={!query.trim() || isLoading}
            className="h-10 w-10 rounded-full transition-all bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 ml-1" />
            )}
          </Button>
        </div>
      </form>
      <div className="px-4 pb-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-3 bg-muted/30 rounded-b-2xl">
        <div className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Inteligência Artificial</span>
        </div>
        <span>Pressione Enter para enviar</span>
      </div>
    </div>
  )
}
