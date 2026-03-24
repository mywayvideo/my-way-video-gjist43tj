import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const fallbackRes = {
    message: 'Neste momento o sistema está indisponível para pesquisas automáticas. Por favor, contate nossos especialistas via WhatsApp.',
    referenced_internal_products: [], 
    should_show_whatsapp_button: true,
    whatsapp_reason: "Sistema de IA temporariamente indisponível.", 
    price_context: "fob_miami",
    used_web_search: false, 
    confidence_level: "low"
  }

  try {
    const supUrl = Deno.env.get('SUPABASE_URL') || ''; 
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Create an admin client to bypass RLS restrictions for public access
    const supabase = createClient(supUrl, serviceRoleKey);

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const user = await supabase.auth.getUser(token);
        userId = user.data.user?.id || null;
      } catch (e) {
        // User not authenticated, continue as anonymous
      }
    }
    
    const { query } = await req.json()
    if (!query) throw new Error('Query is required')

    let cachedResult: any = null;
    let expiredCachedResult: any = null;
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const safeQuery = query.replace(/[%_]/g, '\\$&');
      const { data: cacheData } = await supabase
        .from('product_search_cache')
        .select('*')
        .ilike('search_query', safeQuery)
        .eq('source', 'ai_generated')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheData) {
        const createdAtDate = cacheData.created_at ? new Date(cacheData.created_at) : new Date(0);
        if (createdAtDate > thirtyDaysAgo) {
          cachedResult = cacheData;
        } else {
          expiredCachedResult = cacheData;
        }
      }
    } catch (e) {
      console.error("Cache lookup failed:", e);
    }

    if (cachedResult && cachedResult.product_specs) {
      console.log(`Cache hit for query: ${query}`);
      return new Response(JSON.stringify(cachedResult.product_specs), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch settings with hardcoded defaults
    const { data: set } = await supabase.from('ai_agent_settings').select('*').limit(1).maybeSingle();
    const settings = {
      price: set?.price_threshold_usd ?? 5000,
      kws: set?.whatsapp_trigger_keywords ?? ['comprar', 'orçamento', 'quanto custa', 'disponível', 'preço', 'tabela de preços', 'cotação', 'desconto', 'promoção'],
      maxWeb: set?.max_web_search_attempts ?? 2,
      conf: set?.confidence_threshold_for_whatsapp ?? 'low'
    }

    // 2. Fetch context
    const { data: cData } = await supabase.from('company_info').select('content, type')
    const compInfo = (cData || []).map((c: any) => `[${c.type}]: ${c.content}`).join('\n')
    
    // Explicitly include technical_info and image_url in the query, filter out discontinued products
    const { data: allProducts } = await supabase.from('products').select(`id, name, sku, description, price_usd, technical_info, image_url, is_discontinued`).eq('is_discontinued', false)
    
    const qTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2)
    const matched = (allProducts || []).filter((p: any) => qTerms.some((t: string) => (p.name||'').toLowerCase().includes(t) || (p.sku||'').toLowerCase().includes(t)))
    const productsCtx = (matched.length ? matched : allProducts || []).slice(0, 50)

    // Build plain text formatted context with technical_info
    const formattedInventory = productsCtx.map((p: any) => 
      `ID: ${p.id}\nProduct: ${p.name}\nDescription: ${p.description || ''}\nTechnical Specifications: ${p.technical_info || ''}\nPrice: ${p.price_usd || 0} USD`
    ).join('\n\n');

    // 3. Fetch providers
    const { data: providers } = await supabase.from('ai_providers').select('*').eq('is_active', true).order('priority_order', { ascending: true })
    if (!providers?.length) throw new Error("No active providers found");

    let result: any = null, finalWeb = false;
    
    // Update system prompt to instruct referencing technical_info
    const aiInstructions = "When answering questions about products, reference the Technical Specifications section provided. If the customer asks about a specific feature or certification listed in Technical Specifications, cite it directly from the specifications provided.";
    const sysPrompt = `Você é Consultor Audiovisual Sênior da My Way Video.\nBase Institucional:\n${compInfo}\n${aiInstructions}\nInventário:\n${formattedInventory}\nREGRAS DE RETORNO OBRIGATÓRIAS:\nRetorne APENAS um objeto JSON com: {"message": "Sua resposta técnica em pt-BR", "referenced_internal_products": ["uuid"], "should_show_whatsapp_button": false, "whatsapp_reason": "", "price_context": "fob_miami", "used_web_search": false, "confidence_level": "high"}`
    
    const tools = [{ type: 'function', function: { name: 'search_web', description: 'Google Custom Search para specs.', parameters: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] } } }]

    // 4. Provider Fallback Loop
    for (const p of providers) {
      const key = Deno.env.get(p.api_key_secret_name);
      
      if (!key) {
        return new Response(
          JSON.stringify({ error: 'Chave de API nao configurada. Tente novamente.' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        if (p.provider_name === 'gemini') {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${p.model_id}:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ role: 'user', parts: [{ text: `SYSTEM:\n${sysPrompt}\n\nUSER:\n${query}` }] }], 
                generationConfig: { responseMimeType: "application/json" } 
            })
          });
          if (!res.ok) throw new Error(await res.text());
          result = JSON.parse((await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '{}');
          break;
        } else {
          const url = p.provider_name === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
          let msgs: any[] = [{ role: 'system', content: sysPrompt }, { role: 'user', content: query }];
          let calls = 0, usedWeb = false;
          
          while (calls <= settings.maxWeb) {
            const payload: any = { model: p.model_id, messages: msgs, response_format: { type: 'json_object' } }
            if (calls < settings.maxWeb) { payload.tools = tools; payload.tool_choice = 'auto'; }
            
            const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error(await res.text());
            
            const msg = (await res.json()).choices?.[0]?.message;
            if (msg?.tool_calls) {
              usedWeb = true; msgs.push(msg);
              for (const t of msg.tool_calls) {
                let content = 'Web search unavailable';
                const gKey = Deno.env.get('GOOGLE_SEARCH_API_KEY'), gCx = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');
                if (gKey && gCx) {
                  const queryArgs = JSON.parse(t.function.arguments).q || '';
                  const gsRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${gKey}&cx=${gCx}&q=${encodeURIComponent(queryArgs)}`)
                  if (gsRes.ok) content = ((await gsRes.json()).items || []).slice(0,3).map((i:any)=>i.snippet).join('\n')
                }
                msgs.push({ role: 'tool', tool_call_id: t.id, content });
              }
              calls++;
            } else {
              result = JSON.parse(msg?.content || '{}'); finalWeb = usedWeb; break;
            }
          }
          if (result) break;
        }
      } catch (e) { console.error(`Provider ${p.provider_name} failed:`, e); }
    }

    if (!result) {
      if (expiredCachedResult && expiredCachedResult.product_specs) {
        console.log(`Fallback to expired cache for query: ${query}`);
        return new Response(JSON.stringify(expiredCachedResult.product_specs), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error("All AI providers failed.");
    }

    // --- Confidence Level Detection ---
    if (result.message) {
      const normalizedMsg = result.message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const exactLowConfidencePhrases = [
        "recomendo verificar",
        "depende de",
        "pode variar",
        "nao tenho informacao",
        "consulte",
        "entre em contato",
        "fale com especialista",
        "nao tenho confirmacao",
        "nao posso confirmar",
        "verifique",
        "confira",
        "consulte a documentacao"
      ];

      let isLowConfidence = exactLowConfidencePhrases.some((phrase: string) => normalizedMsg.includes(phrase.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));

      if (normalizedMsg.includes("depende do") && normalizedMsg.includes("recomendo verificar")) isLowConfidence = true;
      if (normalizedMsg.includes("opcoes de frete") || normalizedMsg.includes("checkout")) isLowConfidence = true;
      if (normalizedMsg.includes("entre 7 a 15 dias") && normalizedMsg.includes("recomendo verificar")) isLowConfidence = true;

      // Heuristic for lack of specific technical data when generic words are used
      const genericWords = ["depende", "pode variar", "recomendo"];
      const hasGenericWords = genericWords.some((w: string) => normalizedMsg.includes(w.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
      
      // Simple check for numbers or specific units as a proxy for "technical data"
      const hasSpecificData = /\d/.test(normalizedMsg) || /(fps|hz|khz|mbps|gbps|sdi|hdmi|usb|4k|8k|1080p)/i.test(normalizedMsg);

      if (hasGenericWords && !hasSpecificData) {
          isLowConfidence = true;
      }

      result.confidence_level = isLowConfidence ? "low" : "high";
    } else {
      result.confidence_level = "low";
    }

    // 5. Intelligent WhatsApp Logic Engine
    const qL = query.toLowerCase();
    let show = false, reason = "";
    const refs = Array.isArray(result.referenced_internal_products) ? result.referenced_internal_products : [];
    
    // Condition 1: Low Confidence
    if (result.confidence_level === settings.conf) { show = true; reason = "Necessidade de assistência técnica especializada."; }
    // Condition 2: Purchase Intent
    else if (settings.kws.some((k: string) => qL.includes(k.toLowerCase()))) { show = true; reason = "Interesse demonstrado em compra. Especialista pode oferecer descontos."; }
    // Condition 3: Complex Project
    else if (['integração', 'solução completa', 'customização', 'setup', 'instalação', 'projeto', 'implementação', 'sistema completo'].some(k => qL.includes(k))) { show = true; reason = "Projeto complexo requer consultoria especializada."; }
    // Condition 4: Expensive Product
    else if (refs.length > 0 && productsCtx.some((p:any) => refs.includes(p.id) && (p.price_usd||0) > settings.price)) { show = true; reason = "Produto premium. Especialista pode oferecer condições especiais."; }
    // Condition 5: Multiple Products
    else if (refs.length >= 3) { show = true; reason = "Múltiplos produtos. Especialista pode montar solução integrada."; }

    // Transform referenced UUIDs into full objects with technical_info and image_url
    const resolvedRefs = refs.map((refId: string) => {
      const p = (allProducts || []).find((prod: any) => prod.id === refId);
      if (p) {
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price_usd: p.price_usd,
          technical_info: p.technical_info,
          image_url: p.image_url
        };
      }
      return null;
    }).filter(Boolean);

    // 6. Contract Enforcement
    result.should_show_whatsapp_button = show || !!result.should_show_whatsapp_button;
    result.whatsapp_reason = show ? reason : (result.whatsapp_reason || "");
    result.used_web_search = finalWeb; 
    result.price_context = "fob_miami"; 
    result.referenced_internal_products = resolvedRefs;

    console.log(`Cache miss, saved new entry for query: ${query}`);
    supabase.from('product_search_cache').insert({ 
      search_query: query, 
      product_name: 'AI Match', 
      source: 'ai_generated', 
      product_description: result.message,
      product_specs: result
    }).then()
    
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error("Fatal ai-search error:", err);
    return new Response(JSON.stringify(fallbackRes), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

