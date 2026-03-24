import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Search, Loader2, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Link, useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/use-debounce'

export function DirectSearch() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      setLoading(true)
      supabase
        .from('products')
        .select('id, name, sku, category, image_url, is_discontinued')
        .or(
          `name.ilike.%${debouncedQuery}%,sku.ilike.%${debouncedQuery}%,category.ilike.%${debouncedQuery}%`,
        )
        .limit(6)
        .then(({ data }) => {
          setResults(data || [])
          setLoading(false)
          setOpen(true)
        })
    } else {
      setResults([])
      setOpen(false)
    }
  }, [debouncedQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="w-full relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto (Nome, SKU)..."
          className="w-full pl-10 rounded-full bg-muted/50 border-transparent focus-visible:bg-background transition-all h-10 shadow-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 max-h-[60vh] overflow-y-auto">
          {results.map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              onClick={() => {
                setOpen(false)
                setQuery('')
              }}
              className="flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors border-b border-border/50 last:border-0"
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt=""
                  className="w-10 h-10 object-contain rounded bg-white/5"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  {p.is_discontinued && (
                    <span className="bg-yellow-100 text-yellow-700 rounded-md px-2 py-0.5 font-[600] text-[10px] shrink-0">
                      DESCONTINUADO
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {p.sku} • {p.category || 'Geral'}
                </span>
              </div>
            </Link>
          ))}
          <button
            onClick={() => {
              setOpen(false)
              navigate(`/search?q=${encodeURIComponent(query)}`)
            }}
            className="w-full p-3 text-sm text-center text-primary font-medium hover:bg-muted/50 transition-colors"
          >
            Ver todos os resultados
          </button>
        </div>
      )}
      {open && !loading && debouncedQuery.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg p-4 text-center text-sm text-muted-foreground z-50">
          Nenhum equipamento encontrado.
        </div>
      )}
    </div>
  )
}
