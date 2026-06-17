import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function getKeywordScore(word: string): number {
  const stopWords = new Set([
    'o',
    'a',
    'os',
    'as',
    'um',
    'uma',
    'uns',
    'umas',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'em',
    'no',
    'na',
    'nos',
    'nas',
    'por',
    'para',
    'com',
    'sem',
    'como',
    'que',
    'e',
    'ou',
    'mas',
    'se',
    'eu',
    'você',
    'ele',
    'ela',
    'nós',
    'vós',
    'eles',
    'elas',
    'me',
    'te',
    'se',
    'nos',
    'vos',
    'lhe',
    'lhes',
    'este',
    'esta',
    'isto',
    'esse',
    'essa',
    'isso',
    'aquele',
    'aquela',
    'aquilo',
    'meu',
    'minha',
    'meus',
    'minhas',
    'teu',
    'tua',
    'teus',
    'tuas',
    'seu',
    'sua',
    'seus',
    'suas',
    'nosso',
    'nossa',
    'nossos',
    'nossas',
    'vosso',
    'vossa',
    'vossos',
    'vossas',
    'qual',
    'quais',
    'quem',
    'quanto',
    'quantos',
    'quanta',
    'quantas',
    'onde',
    'quando',
    'porque',
    'porquê',
    'tudo',
    'nada',
    'algo',
    'alguém',
    'ninguém',
    'nenhum',
    'nenhuma',
    'qualquer',
    'quaisquer',
    'outro',
    'outra',
    'outros',
    'outras',
    'muito',
    'muita',
    'muitos',
    'muitas',
    'pouco',
    'pouca',
    'poucos',
    'poucas',
    'mais',
    'menos',
    'tão',
    'tanto',
    'tanta',
    'tantos',
    'tantas',
    'cada',
    'vários',
    'várias',
    'certo',
    'certa',
    'certos',
    'certas',
    'próprio',
    'própria',
    'próprios',
    'próprias',
    'mesmo',
    'mesma',
    'mesmos',
    'mesmas',
    'tal',
    'tais',
    'quero',
    'gostaria',
    'preciso',
    'buscar',
    'pesquisar',
    'encontrar',
  ])

  const lowerWord = word.toLowerCase()

  if (stopWords.has(lowerWord)) return -1

  if (/^[A-Z]+$/.test(word)) return 10

  if (/\d/.test(word)) return 8

  return 1
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const query = body?.query || ''

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Sanitization: preserve alphanumeric integrity
    const cleanQuery = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
    const words = cleanQuery.split(/\s+/).filter((w: string) => w.length > 0)

    const scoredWords = words.map((w: string) => ({
      word: w,
      score: getKeywordScore(w),
    }))

    scoredWords.sort((a: any, b: any) => b.score - a.score)

    const topKeywords = scoredWords
      .filter((w: any) => w.score > 0)
      .slice(0, 3)
      .map((w: any) => w.word)

    let dbQuery = supabase.from('products').select('*')

    if (topKeywords.length > 0) {
      topKeywords.forEach((kw: string) => {
        dbQuery = dbQuery.or(`title.ilike.%${kw}%,ai_summary.ilike.%${kw}%`)
      })
    } else {
      const fallbackTerm = cleanQuery.substring(0, 30).trim()
      if (fallbackTerm) {
        dbQuery = dbQuery.or(`title.ilike.%${fallbackTerm}%,ai_summary.ilike.%${fallbackTerm}%`)
      }
    }

    const { data: products, error: dbError } = await dbQuery.limit(20)

    if (dbError) {
      console.error('Database Error:', dbError)
    }

    const validProducts = products || []
    const allowedProductIds = validProducts.map((p: any) => p.id)

    const productContext = validProducts
      .map(
        (p: any) =>
          `ID: ${p.id} | Titulo: ${p.title || p.name || 'N/A'} | Sumario: ${p.ai_summary || p.description || 'N/A'}`,
      )
      .join('\n')

    const systemPrompt = `
Você é um assistente especialista em audiovisual profissional (My Way Video).
Baseado EXCLUSIVAMENTE nos seguintes produtos do catálogo, responda à dúvida do cliente.
Não sugira produtos fora desta lista.

PRODUTOS ENCONTRADOS:
${productContext || 'Nenhum produto relevante encontrado.'}

Sua resposta deve ser estruturada como um JSON estrito:
{
  "message": "Sua explicação amigável usando Markdown.",
  "confidence_level": "high",
  "referenced_internal_products": ["id_do_produto"],
  "should_show_whatsapp_button": false
}
    `

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    let result = {
      message: 'Aqui estão alguns produtos que encontrei para você.',
      confidence_level: 'low',
      referenced_internal_products: allowedProductIds,
      should_show_whatsapp_button: false,
      products: validProducts,
    }

    try {
      const aiData = await aiResponse.json()
      if (aiData?.choices?.[0]?.message?.content) {
        const parsed = JSON.parse(aiData.choices[0].message.content)
        result = {
          ...result,
          ...parsed,
          products: validProducts,
        }
      }
    } catch (e) {
      console.error('Error parsing AI JSON:', e)
    }

    // Safety: ensure referenced internal products exist in the allowed list
    if (Array.isArray(result.referenced_internal_products)) {
      result.referenced_internal_products = result.referenced_internal_products.filter((id) =>
        allowedProductIds.includes(id),
      )
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
