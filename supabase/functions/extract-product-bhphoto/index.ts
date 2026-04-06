import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import * as cheerio from 'npm:cheerio@1.0.0-rc.12'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  let url = '';

  try {
    const body = await req.json()
    url = body.url

    if (!url || typeof url !== 'string' || !url.startsWith('https://www.bhphotovideo.com/c/product/')) {
      return new Response(JSON.stringify({ error: 'URL invalida. Use um link valido da B&H Photo Video.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let html = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      html = await response.text();
    } catch (error: any) {
      console.error(`Fetch error for URL ${url}:`, error.message);
      return new Response(JSON.stringify({ error: 'Nao foi possivel acessar a pagina.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const $ = cheerio.load(html);
    const plainText = html.replace(/<[^>]+>/g, ' ');

    let name = $('h1[data-selenium="productTitle"]').text().trim();
    if (!name) name = $('h1').first().text().trim();
    if (!name) name = $('title').text().replace(' | B&H Photo Video', '').trim();

    let sku = '';
    const bhMatch = plainText.match(/B&H\s*#\s*([A-Za-z0-9\-]+)/i);
    if (bhMatch) sku = bhMatch[1];
    if (!sku) {
        const mfrMatch = plainText.match(/MFR\s*#\s*([A-Za-z0-9\-]+)/i);
        if (mfrMatch) sku = mfrMatch[1];
    }

    let price_usa = '';
    const priceMeta = $('meta[itemprop="price"]').attr('content');
    if (priceMeta) {
        price_usa = priceMeta.replace(/[^0-9.]/g, '');
    } else {
        const priceText = $('div[data-selenium="pricingPrice"]').first().text();
        if (priceText) price_usa = priceText.replace(/[^0-9.]/g, '');
    }

    let description = $('div[data-selenium="overview"]').text().trim();
    if (!description) description = $('div[class*="overview"]').text().trim();
    if (!description) description = $('meta[name="description"]').attr('content') || '';
    
    let technical_info = $('div[data-selenium="specs"]').text().trim();
    if (!technical_info) technical_info = $('div[class*="specs"]').text().trim();
    if (!technical_info) technical_info = $('section:contains("Specs")').text().trim() || '';

    let weight = '';
    let dimensions = '';
    
    const weightMatch = plainText.match(/Package Weight\s*([\d.]+)\s*lb/i);
    if (weightMatch) {
        weight = weightMatch[1];
    } else {
        const kgMatch = plainText.match(/Package Weight\s*([\d.]+)\s*kg/i);
        if (kgMatch) {
            weight = (parseFloat(kgMatch[1]) * 2.20462).toFixed(2);
        }
    }

    const dimMatch = plainText.match(/Box Dimensions[^\d]*([\d.]+)[\s"in]*(?:x|X)[\s]*([\d.]+)[\s"in]*(?:x|X)[\s]*([\d.]+)/i);
    if (dimMatch) {
        dimensions = `${dimMatch[1]}x${dimMatch[2]}x${dimMatch[3]}`;
    }

    let image_url = $('meta[property="og:image"]').attr('content') || '';
    if (!image_url) {
      image_url = $('img[data-selenium="inlineMediaMainImage"]').attr('src') || '';
    }

    let category = '';
    const breadcrumbs = $('div[data-selenium="breadcrumbs"] a');
    if (breadcrumbs.length > 0) {
        category = breadcrumbs.last().text().trim();
    }

    let is_discontinued = "false";
    const lowerHtml = plainText.toLowerCase();
    if (lowerHtml.includes('discontinued') || lowerHtml.includes('no longer available')) {
        is_discontinued = "true";
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (apiKey && (description || technical_info)) {
        try {
            const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert translator and technical writer. 
Task 1: Translate and summarize the product description to Portuguese (PT-BR) in Markdown. Max 3-4 sentences. Use bold for key features. Describe main function, typical application, and technical nature. Do not use marketing slogans.
Task 2: Translate and format the technical info into a professional PT-BR Markdown list.
Task 3: Identify the most appropriate general category in English (e.g. Cameras, Accessories, Converters, Streaming, Software) based on the breadcrumb.
Return ONLY a JSON object with keys: "description", "technical_info", "category".`
                        },
                        {
                            role: 'user',
                            content: `Description: ${description.substring(0, 1000)}\n\nSpecs: ${technical_info.substring(0, 1500)}\n\nCategory: ${category}`
                        }
                    ],
                    response_format: { type: "json_object" }
                })
            });
            if (llmRes.ok) {
                const llmData = await llmRes.json();
                const parsed = JSON.parse(llmData.choices[0].message.content);
                if (parsed.description) description = parsed.description;
                if (parsed.technical_info) technical_info = parsed.technical_info;
                if (parsed.category) category = parsed.category;
            }
        } catch (e) {
            console.error('LLM Formatting error:', e);
        }
    } else {
        if (description) description = description.substring(0, 500);
        if (technical_info) technical_info = technical_info.substring(0, 1000);
    }

    let category_id = "";
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      if (supabaseUrl && supabaseKey && category) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: dbCategories } = await supabase.from('categories').select('id, name');
        if (dbCategories && dbCategories.length > 0) {
          const catNameLower = category.toLowerCase();
          const matchedCategory = dbCategories.find((c: any) => 
            catNameLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(catNameLower)
          );
          if (matchedCategory) {
            category_id = matchedCategory.id;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching categories from DB:', e);
    }

    const result = {
      name: name || "",
      sku: sku || "",
      price_cost: "",
      price_usa: price_usa || "",
      price_brl: "",
      stock: "",
      category_id: category_id || "",
      description: description || "",
      weight: weight || "",
      dimensions: dimensions || "",
      image_url: image_url || "",
      ncm: "",
      is_special: "false",
      technical_info: technical_info || "",
      is_discontinued: is_discontinued
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`Unhandled error for URL ${url}:`, error.message);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar os dados.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
