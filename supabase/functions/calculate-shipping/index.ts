import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
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
    const bodyText = await req.text()
    let body
    try {
      body = JSON.parse(bodyText)
    } catch (e) {
      return new Response(
        JSON.stringify({
          error:
            'Dados invalidos. Verifique os campos obrigatorios: tipo_entrega, endereco, itens_carrinho.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log('Received calculate-shipping payload:', JSON.stringify(body, null, 2))

    const { delivery_type, address, cart_items } = body

    if (!delivery_type || !address || !Array.isArray(cart_items)) {
      return new Response(
        JSON.stringify({
          error:
            'Dados invalidos. Verifique os campos obrigatorios: tipo_entrega, endereco, itens_carrinho.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (
      delivery_type !== 'coleta' &&
      (!address.street || !address.city || !address.state || !address.zip_code)
    ) {
      return new Response(
        JSON.stringify({ error: 'Endereco incompleto. Preencha: rua, cidade, estado, CEP/ZIP.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (delivery_type === 'coleta') {
      return new Response(
        JSON.stringify({
          shipping_cost: 0,
          message: 'Coleta em Miami. Sem custos.',
          delivery_type,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (delivery_type === 'miami') {
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
      try {
        if (country === 'brasil' || country === 'brazil') {
          const cleanZip = (address.zip_code || '').replace(/\D/g, '')
          const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`)
          if (!viaCepRes.ok) throw new Error('ViaCEP API error')
          const viaCepData = await viaCepRes.json()

          if (viaCepData.erro) {
            throw new Error('ViaCEP not found')
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

          if (!geoRes.ok) throw new Error('Google Geocoding API error')
          const geoData = await geoRes.json()

          if (geoData.status !== 'OK' || !geoData.results?.[0]?.geometry?.location) {
            throw new Error('Google Geocoding returned not OK')
          }

          destLat = geoData.results[0].geometry.location.lat
          destLng = geoData.results[0].geometry.location.lng
        }
      } catch (err: any) {
        console.error('Geocoding Error:', err.stack || err.message)
        return new Response(
          JSON.stringify({
            error: 'Endereco nao encontrado. Verifique o CEP/ZIP e tente novamente.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      if (
        typeof destLat !== 'number' ||
        typeof destLng !== 'number' ||
        isNaN(destLat) ||
        isNaN(destLng) ||
        (destLat === 0 && destLng === 0)
      ) {
        return new Response(
          JSON.stringify({ error: 'Nao foi possivel calcular a distancia. Verifique o endereco.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
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
        return new Response(
          JSON.stringify({
            error:
              "Distancia alem do perimetro maximo de Miami. Selecione 'Entrega EUA' para usar UPS.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      let cost = 0
      try {
        const baseCost = matchedRange.cost_usd
        cost = Math.ceil(baseCost * 10) / 10
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Erro ao processar frete. Tente novamente.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          shipping_cost: cost,
          message: `Frete para Miami: USD ${cost.toFixed(1)}`,
          delivery_type,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (delivery_type === 'sao_paulo') {
      let formula: any
      let additionalWeight = 0

      console.log('DEBUG: delivery_type received', delivery_type)
      console.log('DEBUG: cart_items received', JSON.stringify(cart_items))
      console.log('DEBUG: cart_items length', cart_items.length)

      try {
        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['shipping_sao_paulo_formula', 'shipping_sao_paulo_additional_weight'])

        const formulaStr = settingsData?.find(
          (s) => s.setting_key === 'shipping_sao_paulo_formula',
        )?.setting_value
        const addWeightStr = settingsData?.find(
          (s) => s.setting_key === 'shipping_sao_paulo_additional_weight',
        )?.setting_value

        if (!formulaStr) {
          throw new Error('Configuração de fórmula para São Paulo não encontrada.')
        }

        formula = JSON.parse(formulaStr)
        additionalWeight = Number(addWeightStr) || 0
        console.log('DEBUG: formula loaded', formula)
      } catch (e: any) {
        console.error('Formula error:', e.stack || e.message)
        throw new Error('Erro ao carregar configuracoes.')
      }

      let totalWeightKg = 0
      let totalValue = 0

      try {
        console.log('DEBUG: starting cart_items loop')
        for (let i = 0; i < cart_items.length; i++) {
          const item = cart_items[i]
          console.log(`DEBUG: item [${i}]`, item)
          const lb = Number(
            item.weight_lb !== undefined
              ? item.weight_lb
              : item.weight !== undefined
                ? item.weight
                : item.weight_kg,
          )
          console.log(`DEBUG: item [${i}] lb value`, lb)
          const wKg = (isNaN(lb) ? 0 : lb) * 0.453592
          console.log(`DEBUG: item [${i}] wKg`, wKg)
          const qty = Number(item.quantity) || 1
          console.log(`DEBUG: item [${i}] qty`, qty)
          const subtotalWeight = wKg * qty
          console.log(`DEBUG: item [${i}] subtotal weight`, subtotalWeight)
          const subtotalValue = (Number(item.price_usd) || 0) * qty
          console.log(`DEBUG: item [${i}] subtotal value`, subtotalValue)
          totalWeightKg += subtotalWeight
          totalValue += subtotalValue
          console.log('DEBUG: running totalWeightKg', totalWeightKg)
          console.log('DEBUG: running totalValue', totalValue)
        }
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Nao foi possivel calcular o peso. Tente novamente.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      console.log('DEBUG: totalWeightKg final', totalWeightKg)
      console.log('DEBUG: totalValue final', totalValue)
      console.log('DEBUG: additionalWeight', additionalWeight)
      const finalWeightKg = totalWeightKg + additionalWeight
      console.log('DEBUG: finalWeightKg', finalWeightKg)

      let cost = 0
      let percentualPart = 0
      let weightPart = 0
      let baseCostBefore = 0

      try {
        console.log('DEBUG: formula.value_percentage', formula.value_percentage)
        console.log('DEBUG: formula.weight_price_per_kg', formula.weight_price_per_kg)

        percentualPart = (totalValue * (Number(formula.value_percentage) || 0)) / 100
        weightPart = finalWeightKg * (Number(formula.weight_price_per_kg) || 0)

        console.log('DEBUG: percentual part', percentualPart)
        console.log('DEBUG: weight part', weightPart)

        baseCostBefore = percentualPart + weightPart
        console.log('DEBUG: baseCost before rounding', baseCostBefore)

        cost = Math.ceil(baseCostBefore * 10) / 10
        console.log('DEBUG: baseCost after rounding', cost)
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Erro ao processar frete. Tente novamente.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          shipping_cost: cost,
          message: `Frete para Sao Paulo: USD ${cost.toFixed(1)}`,
          delivery_type,
          debug: {
            cart_items_received: cart_items,
            totalWeightKg: totalWeightKg,
            totalValue: totalValue,
            additionalWeight: additionalWeight,
            finalWeightKg: finalWeightKg,
            percentual_part: percentualPart,
            weight_part: weightPart,
            baseCost_before: baseCostBefore,
            baseCost_after: cost,
            formula_used: formula,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (delivery_type === 'usa') {
      let formula: any
      try {
        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'shipping_usa_formula')
          .single()

        if (!settingsData?.setting_value) {
          throw new Error('Configuração de frete para EUA não encontrada no sistema.')
        }

        formula = JSON.parse(settingsData.setting_value)
      } catch (e: any) {
        throw new Error('Erro ao carregar configuracoes usa.')
      }

      let totalWeightKg = 0
      let totalValue = 0

      try {
        for (const item of cart_items) {
          const lb = Number(
            item.weight_lb !== undefined
              ? item.weight_lb
              : item.weight !== undefined
                ? item.weight
                : item.weight_kg,
          )
          const wKg = (isNaN(lb) ? 0 : lb) * 0.453592
          const qty = Number(item.quantity) || 1
          totalWeightKg += wKg * qty
          totalValue += (Number(item.price_usd) || 0) * qty
        }
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Nao foi possivel calcular o peso. Tente novamente.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      let cost = 0
      try {
        const baseCost =
          (totalValue * (Number(formula.value_percentage) || 0)) / 100 +
          totalWeightKg * (Number(formula.weight_price_per_kg) || 0) +
          (Number(formula.base_cost) || 0)
        cost = Math.ceil(baseCost * 10) / 10
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Erro ao processar frete. Tente novamente.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          shipping_cost: cost,
          message: `Frete para EUA: USD ${cost.toFixed(1)}`,
          delivery_type,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else {
      return new Response(JSON.stringify({ error: 'Tipo de entrega não suportado.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error: any) {
    console.error('Calculate shipping internal error:', error.stack || error.message)

    return new Response(
      JSON.stringify({ error: 'Erro interno no servidor ao processar o frete.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
