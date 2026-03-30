import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autorizado')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Não autorizado')

    const { data: adminCustomer } = await supabaseAdmin.from('customers').select('role').eq('user_id', user.id).single()
    if (adminCustomer?.role !== 'admin') throw new Error('Acesso negado')

    const body = await req.json()
    const { email, password, name, phone, company, role, status, sendEmail } = body

    if (!email || !password || password.length < 8 || !name) {
      return new Response(JSON.stringify({ error: 'Dados inválidos. Verifique os campos obrigatórios.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create auth user
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (createError) {
      if (createError.message.toLowerCase().includes('already registered') || createError.message.toLowerCase().includes('already exists')) {
        return new Response(JSON.stringify({ error: 'Esse email já está registrado.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      throw createError
    }

    const userId = newAuthUser.user.id

    // Give the database trigger a moment to run and create the initial customer record
    await new Promise(resolve => setTimeout(resolve, 500))

    // Update the newly created customer record with all details
    const { error: updateError } = await supabaseAdmin.from('customers').update({
      phone: phone || null,
      company_name: company || null,
      role: role || 'customer',
      status: status || 'ativo',
      full_name: name
    }).eq('user_id', userId)

    if (updateError) {
      console.error('Failed to update customer record:', updateError)
    }

    // Send email if requested
    if (sendEmail) {
      await supabaseAdmin.functions.invoke('send-welcome-email', {
        headers: { Authorization: authHeader },
        body: { email, name, password }
      })
    }

    return new Response(JSON.stringify({ success: true, customer_id: userId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Não foi possível criar cliente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
