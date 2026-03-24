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

  let newRate: number | null = null
  let attempt = 0
  const maxAttempts = 3
  let lastError: any = null

  // Step 1 & 2: Fetch current USD-BRL rate with robust retry logic
  while (attempt < maxAttempts) {
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
      break // Success, exit retry loop
    } catch (error) {
      lastError = error
      attempt++
      if (attempt < maxAttempts) {
        // Exponential backoff: 1.5s, 3s
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
      }
    }
  }

  // Fallback API if AwesomeAPI completely fails
  if (newRate === null) {
    console.error(
      'AwesomeAPI failed after retries, attempting fallback API. Last error:',
      lastError,
    )
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        if (fallbackData?.rates?.BRL) {
          newRate = Number(parseFloat(fallbackData.rates.BRL).toFixed(4))
        }
      }
    } catch (fallbackError) {
      console.error('Fallback API error:', fallbackError)
    }
  }

  if (newRate === null) {
    // Error Handling: All APIs failed
    console.error('All exchange rate APIs failed.')
    return new Response(
      JSON.stringify({
        error: 'Exchange APIs unavailable',
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

    const { error: updateError } = await supabase
      .from('exchange_rate')
      .update({
        usd_to_brl: newRate,
        last_updated: now,
      })
      .eq('id', rowId)

    if (updateError) throw updateError

    // Step 5: Return JSON response
    return new Response(
      JSON.stringify({
        rate: newRate,
        last_updated: now,
        message: 'Taxa atualizada com sucesso',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
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
