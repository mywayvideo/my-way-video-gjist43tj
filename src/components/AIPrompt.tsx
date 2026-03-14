import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AIPrompt({
  initialValue = '',
  autoFocus = false,
}: {
  initialValue?: string
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState(initialValue)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto group">
      <div className="absolute -inset-1 bg-gradient-to-r from-accent/40 to-blue-600/40 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative flex items-center bg-background border border-white/10 rounded-2xl shadow-2xl p-2 focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent/50 transition-all">
        <div className="pl-4 pr-2 text-accent animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <input
          autoFocus={autoFocus}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Peça recomendações de câmeras, lentes ou orçamentos..."
          className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/50 py-3 px-2 text-foreground font-medium"
        />
        <Button
          type="submit"
          size="icon"
          className="h-12 w-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 ml-2 shadow-lg"
          disabled={!query.trim()}
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </form>
  )
}
