import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Metodo nao permitido.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const bodyText = await req.text()
    let body: any = {}
    if (bodyText) {
      try {
        body = JSON.parse(bodyText)
      } catch (e) {
        // Ignore parse error
      }
    }

    const { price_usa, weight } = body

    if (
      typeof price_usa !== 'number' ||
      typeof weight !== 'number' ||
      price_usa <= 0 ||
      weight <= 0
    ) {
      return new Response(
        JSON.stringify({ error: 'Valores invalidos. Preco e peso devem ser maiores que zero.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Convert weight from pounds to kilograms
    const weight_kg = weight / 2.204

    // Calculate shipping cost (Frete Internacional)
    const percentual = 0.1
    const peso_adicional = 0.5
    const preco_por_kg = 120

    const frete = price_usa * percentual + (weight_kg + peso_adicional) * preco_por_kg

    // Calculate final price
    const final_price = price_usa + frete

    // Round to 2 decimal places
    const price_brl = Math.round(final_price * 100) / 100

    return new Response(JSON.stringify({ price_brl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error calculating price:', {
      error: error.message,
      stack: error.stack,
    })
    return new Response(JSON.stringify({ error: 'Erro interno ao calcular o preco.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
