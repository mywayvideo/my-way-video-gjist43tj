import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { delivery_method } = await req.json()
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    let freight = 0

    if (delivery_method === 'coleta') {
      freight = 0
    } else {
      let settingKey = ''
      if (delivery_method === 'miami') settingKey = 'delivery_cost_miami'
      else if (delivery_method === 'usa') settingKey = 'delivery_cost_usa'
      else if (delivery_method === 'brasil') settingKey = 'delivery_cost_brazil'

      if (settingKey) {
        const { data } = await supabaseAdmin.from('app_settings').select('setting_value').eq('setting_key', settingKey).maybeSingle()
        if (data && data.setting_value) {
          freight = parseFloat(data.setting_value) || 0
        } else {
          // Valores padrão caso não configurados no painel
          if (delivery_method === 'miami') freight = 15
          if (delivery_method === 'usa') freight = 50
          if (delivery_method === 'brasil') freight = 120
        }
      }
    }

    return new Response(JSON.stringify({ freight }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
