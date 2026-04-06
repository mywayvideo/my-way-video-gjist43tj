import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let url = ''

  try {
    const body = await req.json()
    url = body.url
    console.log(`[extract-product-bhphoto] Started extraction for URL: ${url}`)

    if (
      !url ||
      typeof url !== 'string' ||
      !url.startsWith('https://www.bhphotovideo.com/c/product/')
    ) {
      console.log(`[extract-product-bhphoto] Invalid URL format provided: ${url}`)
      return new Response(
        JSON.stringify({ error: 'URL invalida. Use um link valido da B&H Photo Video.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const apifyToken = Deno.env.get('APIFY_API_TOKEN')
    if (!apifyToken) {
      console.error(`[extract-product-bhphoto] Missing APIFY_API_TOKEN environment variable.`)
      return new Response(JSON.stringify({ error: 'Chave de API nao configurada.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apifyUrl = `https://api.apify.com/v2/acts/krazee_kaushik~b-h-product-scraper/run-sync-get-dataset-items?token=${apifyToken}`

    let apifyResponse
    try {
      console.log(`[extract-product-bhphoto] Calling Apify API...`)
      const res = await fetch(apifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productUrls: [url] }),
      })

      if (res.status === 429) {
        return new Response(
          JSON.stringify({
            error: 'Limite de requisicoes atingido. Tente novamente em alguns minutos.',
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      if (!res.ok) {
        const errorText = await res.text()
        console.error(
          `[extract-product-bhphoto] Apify HTTP error! Status: ${res.status}, Response: ${errorText}`,
        )
        throw new Error(`Apify HTTP error! status: ${res.status}`)
      }

      apifyResponse = await res.json()
    } catch (error: any) {
      console.error(`[extract-product-bhphoto] Fetch error:`, error.message)
      return new Response(JSON.stringify({ error: 'Nao foi possivel acessar a pagina da B&H.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(apifyResponse) || apifyResponse.length === 0) {
      console.error(`[extract-product-bhphoto] Empty or invalid response from Apify.`)
      return new Response(JSON.stringify({ error: 'Nao foi possivel acessar a pagina da B&H.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const item = apifyResponse[0]

    let name = item.title || item.name || ''
    let sku = item.sku || ''

    let price_usa = ''
    if (item.price) {
      price_usa = String(item.price).replace(/[^0-9.]/g, '')
    }

    let description = item.description || item.overview || ''
    let technical_info = item.specifications || item.specs || ''

    let weight = ''
    if (item.weight) {
      const wStr = String(item.weight)
      const wMatch = wStr.match(/([\d.]+)/)
      if (wMatch) {
        weight = wMatch[1]
        if (wStr.toLowerCase().includes('kg')) {
          weight = (parseFloat(weight) * 2.20462).toFixed(2)
        }
      }
    }

    let dimensions = ''
    if (item.dimensions) {
      const dStr = String(item.dimensions)
      const dimMatch = dStr.match(
        /([\d.]+)[\s"in]*(?:x|X)[\s]*([\d.]+)[\s"in]*(?:x|X)[\s]*([\d.]+)/i,
      )
      if (dimMatch) {
        dimensions = `${dimMatch[1]}x${dimMatch[2]}x${dimMatch[3]}`
      }
    }

    let image_url = ''
    if (item.image) {
      image_url = item.image
    } else if (Array.isArray(item.images) && item.images.length > 0) {
      image_url = item.images[0]
    }

    let category = item.category || ''
    if (Array.isArray(category)) {
      category = category[category.length - 1] || ''
    } else if (typeof category === 'object' && category !== null) {
      category = category.name || ''
    }

    let is_discontinued = 'false'
    let stock = ''
    if (item.availability) {
      const avail = String(item.availability).toLowerCase()
      if (avail.includes('discontinued') || avail.includes('no longer available')) {
        is_discontinued = 'true'
      } else {
        const stockMatch = avail.match(/(\d+)/)
        if (stockMatch) {
          stock = stockMatch[1]
        }
      }
    }

    console.log(
      `[extract-product-bhphoto] Raw extracted: Name: ${name}, SKU: ${sku}, Price: ${price_usa}`,
    )

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (apiKey && (description || technical_info)) {
      try {
        console.log(`[extract-product-bhphoto] Calling OpenAI for formatting...`)
        let contentStr = ''
        if (description)
          contentStr += `Description: ${typeof description === 'string' ? description.substring(0, 1500) : JSON.stringify(description).substring(0, 1500)}\n\n`
        if (technical_info)
          contentStr += `Specs: ${typeof technical_info === 'string' ? technical_info.substring(0, 1500) : JSON.stringify(technical_info).substring(0, 1500)}\n\n`
        if (category)
          contentStr += `Category: ${typeof category === 'string' ? category : JSON.stringify(category)}`

        const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert translator and technical writer. 
Task 1: Translate and summarize the product description to Portuguese (PT-BR) in Markdown. Max 3-4 sentences. Use bold for key features. Describe main function, typical application, and technical nature. Do not use marketing slogans.
Task 2: Translate and format the technical info into a professional PT-BR Markdown list.
Task 3: Identify the most appropriate general category in English (e.g. Cameras, Accessories, Converters, Streaming, Software) based on the input.
Return ONLY a JSON object with keys: "description", "technical_info", "category".`,
              },
              {
                role: 'user',
                content: contentStr,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        })
        if (llmRes.ok) {
          const llmData = await llmRes.json()
          const parsed = JSON.parse(llmData.choices[0].message.content)
          if (parsed.description) description = parsed.description
          if (parsed.technical_info) technical_info = parsed.technical_info
          if (parsed.category) category = parsed.category
          console.log(`[extract-product-bhphoto] OpenAI formatting successful`)
        } else {
          const llmErr = await llmRes.text()
          console.error(
            `[extract-product-bhphoto] OpenAI error status: ${llmRes.status}, body: ${llmErr}`,
          )
        }
      } catch (e: any) {
        console.error('[extract-product-bhphoto] LLM Formatting exception:', e.message)
      }
    } else {
      if (typeof description === 'string') description = description.substring(0, 500)
      else description = JSON.stringify(description).substring(0, 500)
      if (typeof technical_info === 'string') technical_info = technical_info.substring(0, 1000)
      else technical_info = JSON.stringify(technical_info).substring(0, 1000)
    }

    let category_id = ''
    try {
      console.log(`[extract-product-bhphoto] Matching category in DB: ${category}`)
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      if (supabaseUrl && supabaseKey && category) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: dbCategories, error: dbErr } = await supabase
          .from('categories')
          .select('id, name')
        if (dbErr) {
          console.error(`[extract-product-bhphoto] Error querying categories: ${dbErr.message}`)
        } else if (dbCategories && dbCategories.length > 0) {
          const catNameLower = String(category).toLowerCase()
          const matchedCategory = dbCategories.find(
            (c: any) =>
              catNameLower.includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(catNameLower),
          )
          if (matchedCategory) {
            category_id = matchedCategory.id
            console.log(
              `[extract-product-bhphoto] Matched category ID: ${category_id} (${matchedCategory.name})`,
            )
          } else {
            console.log(`[extract-product-bhphoto] No matching category found for: ${category}`)
          }
        }
      }
    } catch (e: any) {
      console.error(`[extract-product-bhphoto] Error fetching categories from DB:`, e.message)
    }

    const result = {
      name: name || '',
      sku: sku || '',
      price_cost: '',
      price_usa: price_usa || '',
      price_brl: '',
      stock: stock || '',
      category_id: category_id || '',
      description: description || '',
      weight: weight || '',
      dimensions: dimensions || '',
      image_url: image_url || '',
      ncm: '',
      is_special: 'false',
      technical_info: technical_info || '',
      is_discontinued: is_discontinued,
    }

    console.log(
      `[extract-product-bhphoto] Extraction complete. Returning result for ${sku || name}`,
    )
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error(
      `[extract-product-bhphoto] Unhandled error for URL ${url}:`,
      error.message,
      error.stack,
    )
    return new Response(JSON.stringify({ error: 'Nao foi possivel acessar a pagina da B&H.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
