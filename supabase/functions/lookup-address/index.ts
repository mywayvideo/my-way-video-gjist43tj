import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cep_or_zip, country } = await req.json()

    if (!cep_or_zip) {
      return new Response(JSON.stringify({ error: 'CEP ou ZIP não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanZip = cep_or_zip.replace(/\D/g, '')

    if (country?.toLowerCase() === 'brasil' || country?.toLowerCase() === 'brazil') {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`)
      if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Erro ao consultar ViaCEP' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const data = await response.json()
      if (data.erro) {
        return new Response(JSON.stringify({ error: 'CEP não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(
        JSON.stringify({
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
          country: 'Brasil',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else {
      // US Zipcode lookup
      const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`)
      if (!response.ok) {
        if (response.status === 404) {
          return new Response(JSON.stringify({ error: 'ZIP não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ error: 'Erro ao consultar ZIP' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const data = await response.json()
      const place = data.places && data.places[0]

      if (!place) {
        return new Response(JSON.stringify({ error: 'Local não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(
        JSON.stringify({
          street: '',
          neighborhood: '',
          city: place['place name'] || '',
          state: place['state abbreviation'] || '',
          country: 'USA',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
