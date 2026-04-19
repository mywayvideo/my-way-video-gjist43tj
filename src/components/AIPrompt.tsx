import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AIPromptProps {
  onSearch: (query: string) => void
  isExternalLoading?: boolean
}

export function AIPrompt({ onSearch, isExternalLoading }: AIPromptProps) {
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    onSearch(query)
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-white opacity-20 rounded-full blur group-hover:opacity-40 transition duration-500"></div>
        <div className="relative flex items-center bg-background border border-white/20 rounded-full shadow-2xl p-2">
          <input
            type="text"
            className="flex-1 bg-transparent px-6 py-4 outline-none text-foreground placeholder:text-muted-foreground text-lg"
            placeholder="Pesquise produtos, especificações ou faça uma pergunta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isExternalLoading}
          />
          <Button
            type="submit"
            size="lg"
            className="rounded-full px-8 h-14"
            disabled={isExternalLoading || !query.trim()}
          >
            {isExternalLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
