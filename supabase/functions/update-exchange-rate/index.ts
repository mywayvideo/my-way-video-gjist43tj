import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // 4. CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  let newRate: number

  // Step 1 & 2: Fetch current USD-BRL rate from AwesomeAPI and parse
  try {
    const apiRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL')
    if (!apiRes.ok) {
      throw new Error(`AwesomeAPI returned status ${apiRes.status}`)
    }
    const data = await apiRes.json()
    if (!data?.USDBRL?.bid) {
      throw new Error('Invalid AwesomeAPI response structure')
    }
    // Parse rate as number with 4 decimal places
    newRate = Number(parseFloat(data.USDBRL.bid).toFixed(4))
    if (isNaN(newRate)) {
      throw new Error('Parsed rate is NaN')
    }
  } catch (error) {
    // Error Handling: AwesomeAPI fails
    console.error('AwesomeAPI error:', error)
    return new Response(
      JSON.stringify({
        error: 'AwesomeAPI unavailable',
        message: 'Falha ao buscar taxa de cambio. Tente novamente.',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Step 3 & 4: Query exchange_rate table and update
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Query exchange_rate table, get first row (id)
    const { data: rows, error: fetchError } = await supabase
      .from('exchange_rate')
      .select('id')
      .limit(1)

    if (fetchError) throw fetchError
    if (!rows || rows.length === 0) {
      throw new Error('No rows found in exchange_rate table')
    }

    const rowId = rows[0].id
    const now = new Date().toISOString()

    // Update exchange_rate table
    const { error: updateError } = await supabase
      .from('exchange_rate')
      .update({
        usd_to_brl: newRate,
        last_updated: now,
      })
      .eq('id', rowId)

    if (updateError) throw updateError

    // Step 5: Return JSON response with new rate and timestamp
    return new Response(
      JSON.stringify({
        rate: newRate,
        last_updated: now,
        message: 'Taxa atualizada com sucesso',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    // Error Handling: Database update fails
    console.error('Database update error:', error)
    return new Response(
      JSON.stringify({
        error: 'Database error',
        message: 'Erro ao atualizar taxa. Tente novamente.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
