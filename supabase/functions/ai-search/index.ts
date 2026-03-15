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
      .select('id, name, description, sku, category')
    const products = productsData || []

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    let result

    if (openAiKey) {
      const systemPrompt = `
You are a highly intelligent and professional AI assistant for "My Way Video", an e-commerce platform for professional audiovisual equipment. 
Your tone must be extremely gentle, professional, and concise. Only provide the requested information without unnecessary fluff.

Priority 1 - Institutional: If the user asks about the company (address, policies, hours, etc), respond strictly using this data: ${companyInfo}. If info is not there, say you don't know and suggest WhatsApp.
Priority 2 - Inventory: If the query is related to a product, search the provided inventory. Return the IDs of matching products.
Priority 3 - Technical: If the query is a technical AV question (e.g. "How to increase focal plane?"), act as a professional Audiovisual Specialist. Answer concisely. Example: "Deverá deixar a abertura da lente o mais fechada possível."

Inventory:
${JSON.stringify(products)}

You MUST return a JSON object with this exact structure:
{
  "type": "institutional" | "products" | "technical" | "not_found",
  "message": "Your gentle, professional, concise response in Portuguese",
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
          message: companyInfo
            ? `Aqui estão as informações institucionais solicitadas:\n\n${companyInfo}`
            : 'No momento não tenho essa informação institucional, mas você pode falar com um especialista pelo WhatsApp.',
          product_ids: [],
        }
      } else if (isTech) {
        let msg =
          'Como especialista audiovisual, recomendo sempre verificar as especificações técnicas detalhadas para obter o melhor resultado no seu projeto.'
        if (
          qLower.includes('focal') ||
          qLower.includes('profundidade') ||
          qLower.includes('abertura')
        ) {
          msg =
            'Deverá deixar a abertura da lente o mais fechada possível para aumentar o plano focal e a profundidade de campo.'
        } else if (qLower.includes('iluminação') || qLower.includes('entrevista')) {
          msg =
            'Para entrevistas, a configuração clássica de 3 pontos (Key, Fill, Backlight) utilizando luzes Daylight ou Bicolores é o padrão da indústria.'
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
            message: `Encontrei ${matched.length} equipamento(s) em nosso inventário que corresponde(m) à sua busca.`,
            product_ids: matched.map((m: any) => m.id),
          }
        } else {
          result = {
            type: 'not_found',
            message: `Não encontrei equipamentos correspondentes a "${query}" em nosso inventário atual. Como possuímos contato direto com os maiores fabricantes, podemos verificar a disponibilidade para você.`,
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
