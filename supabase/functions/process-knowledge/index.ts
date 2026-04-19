import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { url, manufacturer_id, record_id } = body

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch HTML
    const htmlRes = await fetch(url)
    const htmlText = await htmlRes.text()

    // Truncate HTML to avoid token limits
    const truncatedHtml = htmlText.substring(0, 15000)

    const aiKey = Deno.env.get('KNOWLEDGE_AI_KEY') || Deno.env.get('OPENAI_API_KEY')

    let aiTitle = ''
    let aiSummary = ''
    let aiSpecs = ''

    if (aiKey) {
      const prompt = `Extract the following information from the provided HTML text:
1. A suitable Title for the content.
2. Technical Specifications (in Markdown format).
3. A 3-paragraph Summary in Portuguese (PT-BR) about the announcement/product.

Return ONLY a valid JSON in this format:
{
  "title": "...",
  "specs": "...",
  "summary": "..."
}`

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${aiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: truncatedHtml },
          ],
          response_format: { type: 'json_object' },
        }),
      })

      if (aiRes.ok) {
        const aiData = await aiRes.json()
        try {
          const parsed = JSON.parse(aiData.choices[0].message.content)
          if (parsed.title) aiTitle = parsed.title
          if (parsed.specs) aiSpecs = parsed.specs
          if (parsed.summary) aiSummary = parsed.summary
        } catch (e) {}
      } else {
        console.error('AI API Error:', await aiRes.text())
      }
    }

    const combinedContent = `**Especificações Técnicas:**\n${aiSpecs}\n\n**Resumo:**\n${aiSummary}`

    let targetRecordId = record_id

    if (!targetRecordId) {
      // Find existing record by url
      const { data: existing } = await supabase
        .from('market_intelligence')
        .select('id')
        .eq('source_url', url)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        targetRecordId = existing.id
      }
    }

    if (targetRecordId) {
      const { data, error } = await supabase
        .from('market_intelligence')
        .update({
          title: aiTitle || 'Processado Automaticamente',
          ai_summary: combinedContent,
          raw_content: truncatedHtml,
          status: 'published',
        })
        .eq('id', targetRecordId)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      // Insert new if not found
      const { data, error } = await supabase
        .from('market_intelligence')
        .insert({
          title: aiTitle || 'Processado Automaticamente',
          source_url: url,
          manufacturer_id: manufacturer_id || null,
          ai_summary: combinedContent,
          raw_content: truncatedHtml,
          status: 'published',
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
