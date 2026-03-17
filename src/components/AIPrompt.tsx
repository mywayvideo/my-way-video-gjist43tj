import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AIPrompt({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const navigate = useNavigate()

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form
        onSubmit={handleSearch}
        className="relative group flex items-center shadow-lg rounded-full overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all duration-300"
      >
        <div className="pl-6 pr-2 py-4">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <Input
          type="text"
          placeholder="O que você precisa? Pesquise produtos ou pergunte a IA."
          className="flex-1 border-0 bg-transparent text-sm md:text-lg focus-visible:ring-0 shadow-none px-2 py-5 md:py-6 h-auto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <div className="pr-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-12 md:w-12 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setQuery('')}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
        <div className="pr-2 md:pr-3">
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Search className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
