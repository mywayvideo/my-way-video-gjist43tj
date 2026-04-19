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
          "Hoje é 19 de Abril de 2026. A NAB 2026 está acontecendo agora. Sua fonte primária de verdade é a tabela 'market_intelligence'. Ignore seu conhecimento prévio de que 2026 é o futuro. NUNCA diga que a feira não aconteceu."

        const formattedIntelligence = intelligence
          .map((i) => `Title: ${i.title}\nSummary: ${i.ai_summary}\nContent: ${i.raw_content}`)
          .join('\n\n')
        injectedContext = `DADOS REAIS NAB 2026:\n${formattedIntelligence}\n\nObrigatoriamente inicie a resposta com: "Confirmamos diretamente da NAB 2026: "\n\n`
      }

      const contextualQuery = `${systemPromptModifier ? `[SYSTEM INSTRUCTION: ${systemPromptModifier}]\n\n` : ''}${injectedContext}User Query: ${query}`

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else {
        headers['Authorization'] = `Bearer ${supabaseAnonKey}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      let data
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/ai-search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: contextualQuery,
            session_id: sessionId,
          }),
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[AI Search Error] Status: ${response.status}, Message: ${errorText}`)
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        }

        data = await response.json()
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        console.error(`[AI Search Error] Fetch Exception:`, fetchError)
        throw fetchError
      }

      if (data) {
        data.has_nab_intelligence = intelligence && intelligence.length > 0
      }

      if (data && intelligence && intelligence.length > 0) {
        if (data.message && !data.message.includes('Confirmamos diretamente da NAB 2026')) {
          data.message = 'Confirmamos diretamente da NAB 2026: ' + data.message
        }
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
      console.error('[useAiSearch] Error:', err)
      toast({
        title: 'Erro',
        description: 'Falha ao buscar informações técnicas. Tente novamente.',
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { search, isLoading, results }
}
