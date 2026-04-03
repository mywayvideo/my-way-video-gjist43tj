import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { delivery_type, address, cart_items } = body

    if (!delivery_type || !address || !Array.isArray(cart_items)) {
      throw new Error('Dados inválidos. Verifique os campos obrigatórios.')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (delivery_type === 'miami') {
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['warehouse_location', 'shipping_miami_ranges'])

      const warehouseStr = settingsData?.find(
        (s) => s.setting_key === 'warehouse_location',
      )?.setting_value
      const rangesStr = settingsData?.find(
        (s) => s.setting_key === 'shipping_miami_ranges',
      )?.setting_value

      if (!warehouseStr || !rangesStr) {
        throw new Error('Configurações de frete não encontradas.')
      }

      const warehouse = JSON.parse(warehouseStr)
      const ranges = JSON.parse(rangesStr)

      let destLat = 0
      let destLng = 0

      const country = address.country?.toLowerCase() || ''
      if (country === 'brasil' || country === 'brazil') {
        const cleanZip = (address.zip_code || '').replace(/\D/g, '')
        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`)
        if (!viaCepRes.ok) throw new Error('Nao foi possivel validar o endereco. Tente novamente.')
        const viaCepData = await viaCepRes.json()

        if (viaCepData.erro) {
          throw new Error('Nao foi possivel validar o endereco. Tente novamente.')
        }

        if (viaCepData.lat && viaCepData.lon) {
          destLat = parseFloat(viaCepData.lat)
          destLng = parseFloat(viaCepData.lon)
        }
      }

      if (destLat === 0 && destLng === 0) {
        const apiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY')
        if (!apiKey) throw new Error('Chave de geocodificação ausente.')

        const addrStr = `${address.street} ${address.number || ''}, ${address.city}, ${address.state} ${address.zip_code} ${address.country}`
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addrStr)}&key=${apiKey}`,
        )

        if (!geoRes.ok) throw new Error('Nao foi possivel validar o endereco. Tente novamente.')
        const geoData = await geoRes.json()

        if (geoData.status !== 'OK' || !geoData.results?.[0]?.geometry?.location) {
          throw new Error('Nao foi possivel validar o endereco. Tente novamente.')
        }

        destLat = geoData.results[0].geometry.location.lat
        destLng = geoData.results[0].geometry.location.lng
      }

      const distanceKm = calculateHaversineDistance(
        warehouse.latitude,
        warehouse.longitude,
        destLat,
        destLng,
      )

      const sortedRanges = ranges.sort((a: any, b: any) => a.min_km - b.min_km)
      let matchedRange = null

      for (const r of sortedRanges) {
        if (distanceKm >= r.min_km && distanceKm <= r.max_km) {
          matchedRange = r
          break
        }
      }

      if (!matchedRange) {
        throw new Error(
          "Distancia alem do perimetro maximo de Miami. Selecione 'Entrega EUA' para usar UPS.",
        )
      }

      const cost = matchedRange.cost_usd
      return new Response(
        JSON.stringify({
          shipping_cost: cost,
          message: `Frete Miami: distancia ${distanceKm.toFixed(1)} km, valor USD ${cost.toFixed(2)}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (delivery_type === 'sao_paulo') {
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'shipping_sao_paulo_formula')
        .single()

      if (!settingsData?.setting_value) {
        throw new Error('Configuração de fórmula para São Paulo não encontrada.')
      }

      const formula = JSON.parse(settingsData.setting_value)

      let totalWeight = 0
      let totalValue = 0

      for (const item of cart_items) {
        totalWeight += Number(item.weight_kg) || 0
        totalValue += Number(item.price_usd) || 0
      }

      const cost =
        (totalValue * formula.value_percentage) / 100 + totalWeight * formula.weight_price_per_kg

      return new Response(
        JSON.stringify({
          shipping_cost: cost,
          message: `Frete Sao Paulo: peso ${totalWeight.toFixed(2)} kg, valor USD ${totalValue.toFixed(2)}, frete USD ${cost.toFixed(2)}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (delivery_type === 'usa') {
      try {
        // Simulating UPS integration fallback as requested (since it's not present in provided files)
        let totalWeight = 0
        for (const item of cart_items) {
          totalWeight += Number(item.weight_kg) || 1
        }
        const upsCost = 15.0 + totalWeight * 2.5

        return new Response(
          JSON.stringify({
            shipping_cost: upsCost,
            message: `Frete EUA (UPS): peso ${totalWeight.toFixed(2)} kg, frete USD ${upsCost.toFixed(2)}`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      } catch (upsErr) {
        throw new Error('Erro na integracao com a UPS. Tente novamente.')
      }
    } else {
      throw new Error('Tipo de entrega não suportado.')
    }
  } catch (error: any) {
    console.error('Calculate shipping error:', error)

    const msg = error.message || ''
    const isValidation =
      msg.includes('Nao foi possivel validar') ||
      msg.includes('Distancia alem do perimetro') ||
      msg.includes('Dados inválidos')

    const returnMsg = isValidation ? msg : 'Erro ao processar. Tente novamente.'

    return new Response(JSON.stringify({ error: returnMsg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
