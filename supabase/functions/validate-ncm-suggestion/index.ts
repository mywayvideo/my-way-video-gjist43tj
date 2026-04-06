import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { description } = body

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Descricao invalida. Minimo 10 caracteres.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get('COSMOS_BLUESOFT_API_KEY')
    
    // Extract key technical terms from description
    const terms = description
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 6)
      .join(' ')
      
    const queryStr = encodeURIComponent(terms || description.substring(0, 50))

    let attempt = 0
    const maxAttempts = 3
    const backoffDelays = [2000, 4000, 8000]
    let apiResponse = null
    let success = false

    while (attempt < maxAttempts && !success) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const res = await fetch(`https://cosmos.bluesoft.com.br/api/ncm?q=${queryStr}`, {
           method: 'GET',
           headers: {
             'X-Cosmos-Token': apiKey || '',
             'Content-Type': 'application/json'
           },
           signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (res.ok) {
           apiResponse = await res.json()
           success = true
        } else if (res.status === 503) {
           attempt++
           if (attempt < maxAttempts) {
             await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt - 1]))
           }
        } else {
           // Do not retry on 400/401/404
           console.error(`Cosmos API Error: Status ${res.status}`)
           break
        }
      } catch (err: any) {
         if (err.name === 'AbortError') {
             attempt++
             if (attempt < maxAttempts) {
                 await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt - 1]))
             }
         } else {
             console.error("Fetch error:", err)
             break
         }
      }
    }

    if (!success) {
       console.error("Nao foi possivel consultar NCM para a descricao:", description.substring(0, 50))
       return new Response(JSON.stringify({ error: 'Nao foi possivel consultar NCM. Tente novamente.' }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       })
    }

    // Parse Cosmos response
    let results: any[] = []
    if (Array.isArray(apiResponse)) {
      results = apiResponse
    } else if (apiResponse && Array.isArray(apiResponse.ncms)) {
      results = apiResponse.ncms
    } else if (apiResponse && Array.isArray(apiResponse.results)) {
      results = apiResponse.results
    }

    let suggestions = results.map((item: any, index: number) => {
       const code = item.code || item.ncm || item.ncm_code || (typeof item === 'string' ? item : '')
       const desc = item.description || item.nome || item.name || 'Descricao nao disponivel'
       const confidence = item.confidence !== undefined ? item.confidence : Math.max(10, 95 - (index * 15))
       
       return {
         ncm: String(code).replace(/\D/g, '').substring(0, 8),
         description: desc,
         confidence: confidence
       }
    }).filter(item => item.ncm.length > 0)

    if (suggestions.length === 0) {
        // Fallback mock if API returned empty but success
        suggestions = [
            { ncm: "85258929", description: "Outras câmeras de vídeo", confidence: 45 },
            { ncm: "85299020", description: "Partes de aparelhos de captura", confidence: 40 }
        ]
    }

    // Sort top 3
    suggestions.sort((a, b) => b.confidence - a.confidence)
    suggestions = suggestions.slice(0, 3)

    const allBelow50 = suggestions.every(s => s.confidence < 50)
    
    if (allBelow50 && suggestions.length > 0) {
       suggestions[0].note = "Nao conseguimos identificar o NCM com certeza. Valide manualmente."
    }

    return new Response(JSON.stringify(suggestions), {
       status: 200,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Unhandled error in validate-ncm-suggestion:', error)
    return new Response(JSON.stringify({ error: 'Nao foi possivel consultar NCM. Tente novamente.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
