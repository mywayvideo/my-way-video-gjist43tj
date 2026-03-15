import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    const body = await req.json()
    const query = body.query

    if (!query) {
      throw new Error('Query is required')
    }

    const { data: companyData } = await supabase.from('company_info').select('content')
    const companyInfo = companyData?.map((c: any) => c.content).join('\n') || ''

    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, description, sku, category, is_special')
    const products = productsData || []

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    let result

    if (openAiKey) {
      const systemPrompt = `
You are an expert technical AI assistant for "My Way Video", an e-commerce platform for professional audiovisual equipment. 
Your tone must be highly professional, direct, and extremely concise. Do NOT use filler words. Return ONLY the requested information.

Knowledge Base (Institutional):
${companyInfo}

Current Inventory:
${JSON.stringify(products)}

Priority of answers (Strict):
1. Institutional: If the user asks for company details, extract ONLY the exact information requested from the Knowledge Base. DO NOT return the full text.
2. Inventory Search: If the user is looking for a product we have, return a concise message and the IDs of the products.
3. Technical Audiovisual Consulting: If the user asks a technical question (e.g., "Does FX3 have native SLOG?", "How to light a set?"), act as an industry expert and answer using your internal knowledge concisely, even if the equipment is not in our inventory.

If the user query does not fit the above or you cannot help, return type "not_found" and a concise message suggesting they speak to an expert via WhatsApp.

You MUST return a JSON object with this exact structure:
{
  "type": "institutional" | "products" | "technical" | "not_found",
  "message": "Your highly concise, professional response in Portuguese",
  "product_ids": ["uuid1", "uuid2"] // only for 'products' type, empty array otherwise
}
`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          response_format: { type: 'json_object' },
        }),
      })

      const aiData = await response.json()
      result = JSON.parse(aiData.choices[0].message.content)

      if (result.type === 'products' && (!result.product_ids || result.product_ids.length === 0)) {
        result.type = 'not_found'
      }
    } else {
      // Mock logic without OpenAI
      const qLower = query.toLowerCase()

      const institutionalKeywords = [
        'horário',
        'endereço',
        'telefone',
        'contato',
        'sobre',
        'política',
        'garantia',
        'devolução',
        'local',
        'loja',
        'pagamento',
        'frete',
        'entrega',
        'cnpj',
        'funcionamento',
        'institucional',
        'quem somos',
      ]
      const technicalKeywords = [
        'como',
        'melhor',
        'técnica',
        'lente',
        'focal',
        'iluminação',
        'entrevista',
        'profundidade',
        'abertura',
        'sensor',
        'configuração',
        'dica',
        'ajuda',
        'slog',
        'nativo',
        'resolução',
        'fps',
      ]

      const isInst = institutionalKeywords.some((kw) => qLower.includes(kw))
      const isTech =
        !isInst &&
        technicalKeywords.some((kw) => qLower.includes(kw)) &&
        !qLower.includes('comprar') &&
        !qLower.includes('preço')

      if (isInst) {
        result = {
          type: 'institutional',
          message:
            'Endereço: 1735 NW 79th Av., Doral, FL 33126. Telefone: +1-786-716-1170. E-mail: sales@mywayvideo.com',
          product_ids: [],
        }
      } else if (isTech) {
        let msg = 'Como consultor técnico, sugiro sempre otimizar seu setup.'
        if (qLower.includes('slog') || qLower.includes('sensor')) {
          msg =
            'Câmeras da linha cinema, como a Sony FX3, possuem curvas S-Log3 nativas e dual base ISO, proporcionando maior latitude e flexibilidade na coloração.'
        } else if (qLower.includes('iluminação') || qLower.includes('entrevista')) {
          msg =
            'Para entrevistas corporativas, a iluminação de 3 pontos (Key, Fill, Backlight) utilizando LEDs Bicolores é a técnica padrão e mais recomendada.'
        }
        result = {
          type: 'technical',
          message: msg,
          product_ids: [],
        }
      } else {
        const matched = products.filter(
          (p: any) =>
            p.name.toLowerCase().includes(qLower) ||
            (p.description && p.description.toLowerCase().includes(qLower)) ||
            (p.sku && p.sku.toLowerCase().includes(qLower)) ||
            (p.category && p.category.toLowerCase().includes(qLower)),
        )

        if (matched.length > 0) {
          result = {
            type: 'products',
            message: `Encontrado(s) ${matched.length} equipamento(s) no inventário.`,
            product_ids: matched.map((m: any) => m.id),
          }
        } else {
          result = {
            type: 'not_found',
            message:
              'Não localizei este item ou informação específica. Nossa equipe pode ajudar via WhatsApp.',
            product_ids: [],
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
