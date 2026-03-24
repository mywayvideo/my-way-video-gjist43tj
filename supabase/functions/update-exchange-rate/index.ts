import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Step 1: Query exchange_rate table, get last_updated timestamp
    const { data: rows, error: fetchError } = await supabase
      .from('exchange_rate')
      .select('id, usd_to_brl, last_updated')
      .limit(1)

    if (fetchError) throw fetchError
    if (!rows || rows.length === 0) {
      throw new Error('No rows found in exchange_rate table')
    }

    const dbRow = rows[0]
    const rowId = dbRow.id
    const currentRate = dbRow.usd_to_brl
    const lastUpdated = new Date(dbRow.last_updated)
    const now = new Date()

    // Step 2: Calculate time difference: now - last_updated
    const diffMs = now.getTime() - lastUpdated.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)

    // Step 3: If time difference is less than 10 minutes (600 seconds)
    if (diffSeconds < 600) {
      const remainingMinutes = Math.max(1, 10 - diffMinutes)
      return new Response(
        JSON.stringify({
          rate: currentRate,
          last_updated: dbRow.last_updated,
          cached: true,
          message: `Taxa em cache. Proxima atualizacao em ${remainingMinutes} minutos.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Step 4: If time difference is 10 minutes or more
    let newRate: number | null = null
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const apiRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!apiRes.ok) {
        throw new Error(`AwesomeAPI returned status ${apiRes.status}`)
      }

      const data = await apiRes.json()
      if (!data?.USDBRL?.bid) {
        throw new Error('Invalid AwesomeAPI response structure')
      }

      const parsedRate = Number(parseFloat(data.USDBRL.bid).toFixed(4))
      if (isNaN(parsedRate)) {
        throw new Error('Parsed rate is NaN')
      }

      newRate = parsedRate
    } catch (error) {
      console.error('AwesomeAPI fetch error:', error)
    }

    // Error Handling: If AwesomeAPI fails
    if (newRate === null) {
      return new Response(
        JSON.stringify({
          rate: currentRate,
          last_updated: dbRow.last_updated,
          cached: true,
          message: 'Taxa em cache. Falha ao buscar nova taxa. Tente novamente em 15 minutos.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Update database with new rate and timestamp
    const nowIso = now.toISOString()
    const { error: updateError } = await supabase
      .from('exchange_rate')
      .update({
        usd_to_brl: newRate,
        last_updated: nowIso,
      })
      .eq('id', rowId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        rate: newRate,
        last_updated: nowIso,
        cached: false,
        message: 'Taxa atualizada com sucesso',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    // If database query fails
    console.error('Database query or unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Database error',
        message: 'Erro ao buscar taxa. Tente novamente.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
