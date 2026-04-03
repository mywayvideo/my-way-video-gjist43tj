import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cep_or_zip, country } = await req.json()

    if (!cep_or_zip || !country) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (country === 'Brasil') {
      const cleanCep = cep_or_zip.replace(/\D/g, '')
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      if (!res.ok) throw new Error('ViaCEP error')
      const data = await res.json()
      if (data.erro) throw new Error('CEP not found')
      
      return new Response(JSON.stringify({
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || ''
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      const cleanZip = cep_or_zip.replace(/\D/g, '')
      const res = await fetch(`https://api.zippopotam.us/us/${cleanZip}`)
      if (!res.ok) throw new Error('Zippopotam error')
      const data = await res.json()
      const place = data.places && data.places[0]
      if (!place) throw new Error('ZIP not found')
      
      return new Response(JSON.stringify({
        street: '',
        neighborhood: '',
        city: place['place name'] || '',
        state: place['state abbreviation'] || ''
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
