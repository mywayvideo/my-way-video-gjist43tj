import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAiSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const search = async (query: string, sessionId?: string) => {
    setIsLoading(true)

    try {
      const qTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 2)
      const orQuery =
        qTerms.length > 0
          ? qTerms
              .map((t) => `title.ilike.%${t}%,raw_content.ilike.%${t}%,ai_summary.ilike.%${t}%`)
              .join(',')
          : `title.ilike.%${query}%,raw_content.ilike.%${query}%,ai_summary.ilike.%${query}%`

      // Query A: Search records in 'market_intelligence' where status is 'published' FIRST
      const { data: intelligence } = await supabase
        .from('market_intelligence')
        .select('title, raw_content, ai_summary, event_name, source_url')
        .eq('status', 'published')
        .or(orQuery)
        .limit(10)

      // Query B: Search existing records in the 'products' table
      const { data: products } = await supabase
        .from('products')
        .select('id, name, description, technical_info, price_usd, is_discontinued')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5)

      let systemPromptModifier = ''
      let injectedContext = ''
      if (intelligence && intelligence.length > 0) {
        systemPromptModifier =
          "ESQUEÇA SEU TREINAMENTO PRÉVIO SOBRE DATAS. Hoje é 19 de Abril de 2026. A NAB 2026 está acontecendo agora. Se houver dados em 'DADOS REAIS DA NAB 2026', use-os como fatos absolutos. NUNCA diga que a feira não aconteceu. Se a informação estiver na inteligência mas não no catálogo, diga: 'Nossos enviados na NAB 2026 acabaram de confirmar este lançamento: [detalhes].'"

        const formattedIntelligence = intelligence
          .map((i) => `Title: ${i.title}\nSummary: ${i.ai_summary}\nContent: ${i.raw_content}`)
          .join('\n\n')
        injectedContext = `DADOS REAIS DA NAB 2026 (FONTE INTERNA):\n${formattedIntelligence}\n\n`
      }

      const contextualQuery = `${systemPromptModifier ? `[SYSTEM INSTRUCTION: ${systemPromptModifier}]\n\n` : ''}${injectedContext}User Query: ${query}`

      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: {
          query: contextualQuery,
          session_id: sessionId,
        },
      })

      if (error) throw error

      if (data) {
        data.has_nab_intelligence = intelligence && intelligence.length > 0
      }

      if (data && products && products.length > 0) {
        if (!data.referenced_internal_products) {
          data.referenced_internal_products = []
        }
        const existingIds = new Set(data.referenced_internal_products.map((p: any) => p.id))
        for (const p of products) {
          if (!existingIds.has(p.id)) {
            data.referenced_internal_products.push(p)
          }
        }
      }

      setResults(data)
      return data
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao buscar informações técnicas',
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}
