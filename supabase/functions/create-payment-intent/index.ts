import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { order_id, amount } = await req.json()

    // Mock Stripe payment link creation as an example
    const payment_link = `https://my-way-beta-ia.goskip.app/mock-payment?order=${order_id}&amount=${amount}`

    return new Response(JSON.stringify({ payment_link }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
