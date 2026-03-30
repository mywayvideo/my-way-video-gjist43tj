import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    const { email, password, name, phone, company, hcaptchaToken } = body

    if (!email || !password || password.length < 8 || !name || !hcaptchaToken) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos. Verifique os campos obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const hcaptchaSecret =
      Deno.env.get('HCAPTCHA_SECRET_KEY') || '0x0000000000000000000000000000000000000000'
    const params = new URLSearchParams()
    params.append('secret', hcaptchaSecret)
    params.append('response', hcaptchaToken)

    const hcaptchaRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const hcaptchaData = await hcaptchaRes.json()
    if (!hcaptchaData.success) {
      return new Response(JSON.stringify({ error: 'Verificação de humano falhou.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingUser } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Esse email já está registrado.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError) throw createError
    const userId = newAuthUser.user.id

    await new Promise((resolve) => setTimeout(resolve, 800))

    await supabaseAdmin
      .from('customers')
      .update({
        phone: phone || null,
        company_name: company || null,
        role: 'customer',
        status: 'ativo',
        full_name: name,
      })
      .eq('user_id', userId)

    return new Response(JSON.stringify({ success: true, customer_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Não foi possível criar conta.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
