import { createClient } from 'jsr:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

// ==================== CONSTANTS ====================
const GLOBAL_TIMEOUT_MS = 25000
const PER_TRIAL_TIMEOUT_MS = 10000
const MAX_PRODUCTS_FROM_RPC = 100
const MAX_PRODUCTS_IN_PROMPT = 20
const MAX_CONTEXT_CHARS = 25000
const MAX_QUERY_LENGTH = 300
const MAX_MESSAGE_LENGTH = 4000
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_SEC = 60
const SPEC_KEY_REGEX = /^[a-z0-9_]{1,50}$/
const SPEC_VALUE_MAX_LENGTH = 1000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

// ==================== TYPES ====================
interface ProductRecord {
  id: string
  name: string
  description: string | null
  final_rank: number
  price_brl?: number | null
  price_usd?: number | null
  stock?: number
  category?: string | null
  image_url?: string | null
  weight?: number | null
  dimensions?: string | null
  ncm?: string | null
  manufacturer_id?: string | null
  mi: unknown[]
  psc: unknown[]
  pc: Record<string, { value: string; source: string; confidence: number }>
}

interface AIResponseSchema {
  message: string
  confidence_level: 'high' | 'low'
  referenced_internal_products: string[]
  should_show_whatsapp_button: boolean
  pc_save_request: Array<{
    product_id: string
    spec_key: string
    spec_value: string
    source: string
    confidence: number
  }>
  psc_save_request: Array<{
    search_query: string
    product_specs: Record<string, string>
  }>
}

interface ProviderCapability {
  supportsTools: boolean
  supportsToolChoice: boolean
  supportsJsonMode: boolean
  supportsFunctionRole: boolean
  endpointStyle: 'openai' | 'anthropic' | 'gemini'
  endpointPath: string
  authType: 'bearer' | 'x-api-key' | 'query-param'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  query: string
  currentProductId?: string
  chat_history?: Message[]
  session_id?: string
}

// ==================== CAPABILITY MAP ====================
const PROVIDER_CAPABILITIES: Record<string, ProviderCapability> = {
  openai: {
    supportsTools: true,
    supportsToolChoice: true,
    supportsJsonMode: true,
    supportsFunctionRole: true,
    endpointStyle: 'openai',
    endpointPath: '/v1/chat/completions',
    authType: 'bearer',
  },
  deepseek: {
    supportsTools: true,
    supportsToolChoice: true,
    supportsJsonMode: true,
    supportsFunctionRole: true,
    endpointStyle: 'openai',
    endpointPath: '/chat/completions',
    authType: 'bearer',
  },
  claude: {
    supportsTools: true,
    supportsToolChoice: false,
    supportsJsonMode: false,
    supportsFunctionRole: false,
    endpointStyle: 'anthropic',
    endpointPath: '/v1/messages',
    authType: 'x-api-key',
  },
  gemini: {
    supportsTools: false,
    supportsToolChoice: false,
    supportsJsonMode: false,
    supportsFunctionRole: false,
    endpointStyle: 'gemini',
    endpointPath: '/v1beta/models/gemini-1.5-flash:generateContent',
    authType: 'query-param',
  },
}

// ==================== CIRCUIT BREAKER ====================
class CircuitBreaker {
  private failureCount = 0
  private lastFailureAt: number | null = null
  private readonly threshold = 3
  private readonly recoveryTimeMs = 60000

  recordFailure(): void {
    this.failureCount++
    this.lastFailureAt = Date.now()
  }

  recordSuccess(): void {
    this.failureCount = 0
    this.lastFailureAt = null
  }

  isOpen(): boolean {
    if (this.failureCount >= this.threshold && this.lastFailureAt) {
      if (Date.now() - this.lastFailureAt < this.recoveryTimeMs) {
        return true
      } else {
        this.recordSuccess()
        return false
      }
    }
    return false
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>()

function getCircuitBreaker(provider: string): CircuitBreaker {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, new CircuitBreaker())
  }
  return circuitBreakers.get(provider)!
}

// ==================== RATE LIMIT (FALLBACK IN-MEMORY) ====================
const inMemoryRateLimit = new Map<string, { count: number; windowStart: number }>()
let rateLimitCircuitBreakerOpen = false

function checkInMemoryRateLimit(ip: string): boolean {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_SEC) * RATE_LIMIT_WINDOW_SEC
  const key = `${ip}:execute_ai_search_v2`
  const entry = inMemoryRateLimit.get(key)
  if (!entry || entry.windowStart < windowStart) {
    inMemoryRateLimit.set(key, { count: 1, windowStart })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }
  entry.count++
  return true
}

// ==================== AUXILIARY FUNCTIONS ====================
function sanitizeInput(input: string): string {
  let s = input.normalize('NFKC')
  // Remove control characters except newline, tab, carriage return
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // Remove HTML tags
  s = s.replace(/<[^>]*>/g, '')
  // Remove zero-width characters
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '')
  // Limit length
  s = s.slice(0, MAX_QUERY_LENGTH)
  return s
}

function sanitizeForLLM(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  s = s.replace(/[<>{}`]/g, '')
  s = s.slice(0, 2000)
  return s
}

function isValidChatMessage(msg: unknown): msg is Message {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  if (m.role !== 'user' && m.role !== 'assistant') return false
  if (typeof m.content !== 'string') return false
  m.content = sanitizeInput(m.content).slice(0, MAX_MESSAGE_LENGTH)
  return true
}

async function hashQuery(query: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(query)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getProviderEndpoint(provider: string, base: string, apiKey?: string): string {
  const cap = PROVIDER_CAPABILITIES[provider]
  if (!cap) throw new Error(`Unknown provider: ${provider}`)
  let url = `${base}${cap.endpointPath}`
  if (cap.authType === 'query-param' && apiKey) {
    url += `?key=${encodeURIComponent(apiKey)}`
  }
  return url
}

function validateProductRecord(raw: unknown): ProductRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (
    typeof r.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id)
  )
    return null
  if (typeof r.name !== 'string' || r.name.trim() === '') return null
  if (typeof r.final_rank !== 'number') return null
  const pc =
    r.pc && typeof r.pc === 'object'
      ? (r.pc as Record<string, { value: string; source: string; confidence: number }>)
      : {}
  return {
    id: r.id,
    name: r.name,
    description: typeof r.description === 'string' ? r.description : null,
    final_rank: r.final_rank,
    price_brl: typeof r.price_brl === 'number' ? r.price_brl : null,
    price_usd: typeof r.price_usd === 'number' ? r.price_usd : null,
    stock: typeof r.stock === 'number' ? r.stock : undefined,
    category: typeof r.category === 'string' ? r.category : null,
    image_url: typeof r.image_url === 'string' ? r.image_url : null,
    weight: typeof r.weight === 'number' ? r.weight : null,
    dimensions: typeof r.dimensions === 'string' ? r.dimensions : null,
    ncm: typeof r.ncm === 'string' ? r.ncm : null,
    manufacturer_id: typeof r.manufacturer_id === 'string' ? r.manufacturer_id : null,
    mi: Array.isArray(r.mi) ? r.mi : [],
    psc: Array.isArray(r.psc) ? r.psc : [],
    pc: pc,
  }
}

function buildRequestBody(
  providerType: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  hasTools: boolean,
  toolDefinition?: object,
): object {
  const cap = PROVIDER_CAPABILITIES[providerType]
  if (!cap) throw new Error(`Unknown provider: ${providerType}`)

  switch (cap.endpointStyle) {
    case 'openai': {
      const body: Record<string, unknown> = {
        model: 'gpt-4-turbo', // or dynamic model selection
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }
      if (hasTools && cap.supportsTools && toolDefinition) {
        body.tools = [toolDefinition]
        if (cap.supportsToolChoice) {
          body.tool_choice = 'required'
        }
      }
      if (cap.supportsJsonMode) {
        body.response_format = { type: 'json_object' }
      }
      return body
    }
    case 'anthropic': {
      // Claude: system prompt goes in 'system', messages must contain only user/assistant
      const claudeMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
      const body: Record<string, unknown> = {
        model: 'claude-3-5-sonnet-20241022',
        system: systemPrompt,
        messages: claudeMessages,
        max_tokens: 1024,
      }
      if (hasTools && cap.supportsTools && toolDefinition) {
        body.tools = [
          {
            name: (toolDefinition as any).function?.name || 'search_products',
            description: (toolDefinition as any).function?.description || '',
            input_schema: (toolDefinition as any).function?.parameters || {},
          },
        ]
      }
      return body
    }
    case 'gemini': {
      // Gemini: contents, systemInstruction?
      const body: Record<string, unknown> = {
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      }
      body.systemInstruction = { parts: [{ text: systemPrompt }] }
      if (hasTools && toolDefinition) {
        body.tools = [{ functionDeclarations: [toolDefinition] }]
      }
      return body
    }
    default:
      return {}
  }
}

function normalizeProviderResponse(
  providerType: string,
  rawData: unknown,
): {
  content: string
  toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>
  finishReason: string
} {
  const defaultResult = { content: '', toolCalls: [], finishReason: 'stop' }
  if (typeof rawData !== 'object' || rawData === null) return defaultResult
  const data = rawData as Record<string, unknown>
  const cap = PROVIDER_CAPABILITIES[providerType]
  if (!cap) return defaultResult

  switch (cap.endpointStyle) {
    case 'openai': {
      const choice = (data as any)?.choices?.[0]
      if (!choice) return defaultResult
      const content = choice.message?.content || ''
      const toolCalls = (choice.message?.tool_calls || []).map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      }))
      const finishReason = choice.finish_reason || 'stop'
      return { content, toolCalls, finishReason }
    }
    case 'anthropic': {
      const contentBlock = data as any
      const content = contentBlock?.content?.[0]?.text || ''
      const toolUse = contentBlock?.content?.find((c: any) => c.type === 'tool_use')
      const toolCalls = toolUse
        ? [
            {
              id: toolUse.id,
              type: 'function',
              function: { name: toolUse.name, arguments: JSON.stringify(toolUse.input) },
            },
          ]
        : []
      const finishReason = contentBlock?.stop_reason || 'stop'
      return { content, toolCalls, finishReason }
    }
    case 'gemini': {
      const candidate = (data as any)?.candidates?.[0]
      if (!candidate) return defaultResult
      const content = candidate.content?.parts?.[0]?.text || ''
      const toolCalls = []
      const finishReason = candidate.finishReason || 'stop'
      return { content, toolCalls, finishReason }
    }
    default:
      return defaultResult
  }
}

function parseAIJson(raw: string): AIResponseSchema | null {
  let json: Record<string, unknown> | null = null
  try {
    json = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        json = JSON.parse(match[0])
      } catch {
        return null
      }
    } else {
      return null
    }
  }
  if (!json || typeof json !== 'object') return null
  // Ensure required fields with defaults
  const message = typeof json.message === 'string' ? json.message : ''
  const confidence_level =
    json.confidence_level === 'high' || json.confidence_level === 'low'
      ? json.confidence_level
      : 'low'
  const referenced_internal_products = Array.isArray(json.referenced_internal_products)
    ? json.referenced_internal_products.filter((p) => typeof p === 'string')
    : []
  const should_show_whatsapp_button =
    typeof json.should_show_whatsapp_button === 'boolean' ? json.should_show_whatsapp_button : false
  const pc_save_request = Array.isArray(json.pc_save_request)
    ? json.pc_save_request.filter(
        (r) =>
          typeof r.product_id === 'string' &&
          typeof r.spec_key === 'string' &&
          typeof r.spec_value === 'string' &&
          typeof r.source === 'string' &&
          typeof r.confidence === 'number',
      )
    : []
  const psc_save_request = Array.isArray(json.psc_save_request)
    ? json.psc_save_request.filter(
        (r) => typeof r.search_query === 'string' && typeof r.product_specs === 'object',
      )
    : []
  return {
    message,
    confidence_level,
    referenced_internal_products,
    should_show_whatsapp_button,
    pc_save_request,
    psc_save_request,
  }
}

// ==================== SETTINGS LOADING ====================
async function loadCacheSettings(supabase: ReturnType<typeof createClient>): Promise<void> {
  // Optionally load custom TTLs from settings table
}

async function getManufacturersContext(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await supabase.from('manufacturers').select('name')
  if (error || !data) return 'No manufacturers available.'
  const names = data.map((m) => m.name).filter(Boolean)
  return names.length > 0
    ? `Fabricantes disponíveis: ${names.join(', ')}`
    : 'No manufacturers available.'
}

async function loadActiveProviders(supabase: ReturnType<typeof createClient>): Promise<
  Array<{
    id: string
    provider_name: string
    model_id: string
    custom_endpoint: string
    api_key_secret_name: string
  }>
> {
  const { data, error } = await supabase
    .from('ai_providers')
    .select('id, provider_name, model_id, custom_endpoint, api_key_secret_name')
    .eq('is_active', true)
    .order('priority_order', { ascending: true })

  if (error || !data) return []
  return data
}

// ==================== HEURISTIC INTENT ====================
function getHeuristicIntent(
  query: string,
  currentProductId?: string,
): 'institutional' | 'product_specific' | 'generic' {
  if (
    currentProductId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentProductId)
  ) {
    return 'product_specific'
  }
  const lowerQuery = query.toLowerCase()
  const institutionalTerms = ['sobre', 'quem somos', 'my way', 'empresa', 'contato', 'ajuda']
  if (institutionalTerms.some((t) => lowerQuery.includes(t))) {
    return 'institutional'
  }
  return 'generic'
}

// ==================== MAIN HANDLER ====================
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    // Only POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Client IP
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      'unknown'

    // Rate Limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try RPC rate limit, fallback to in-memory
    let rateAllowed = false
    try {
      const { data: allowed } = await supabase.rpc('check_rate_limit', {
        p_ip: ip,
        p_endpoint: 'execute_ai_search_v2',
        p_max_requests: RATE_LIMIT_MAX,
        p_window_seconds: RATE_LIMIT_WINDOW_SEC,
      })
      if (allowed === true) {
        rateAllowed = true
      }
    } catch {
      // RPC failed, use fallback
      if (!rateLimitCircuitBreakerOpen) {
        rateAllowed = checkInMemoryRateLimit(ip)
      } else {
        rateAllowed = false
      }
    }
    if (!rateAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Sanitize query
    const query = sanitizeInput(body.query || '')
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is empty' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Load settings and manufacturers
    const manufacturersContext = await getManufacturersContext(supabase)
    const providers = await loadActiveProviders(supabase)
    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: 'No active AI providers' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // System prompt
    const systemPrompt = `Você é um consultor técnico da My Way Video, especialista em equipamentos audiovisuais profissionais. ${manufacturersContext}. Responda perguntas sobre produtos, especificações técnicas e recomendações. SEMPRE use a ferramenta search_products para buscar informações. Nunca invente produtos. Use o contexto de market_intelligence (MI), product_search_cache (PSC) e product_cache (PC) para enriquecer respostas, mas nunca substitua nome ou preço. Limite-se a no máximo ${MAX_PRODUCTS_IN_PROMPT} produtos. Retorne estritamente um JSON no formato: { "message": "...", "confidence_level": "high" ou "low", "referenced_internal_products": ["..."], "should_show_whatsapp_button": true/false, "pc_save_request": [...], "psc_save_request": [...] }. Preencha pc_save_request apenas com novas especificações descobertas. Preencha psc_save_request com especificações úteis da busca.`

    // Build cache key
    const cacheKey = await hashQuery(
      query + systemPrompt + providers.map((p) => p.provider_name).join(','),
    )

    // Check cache
    const { data: cachedResponse } = await supabase
      .from('ai_response_cache')
      .select('response')
      .eq('query_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (cachedResponse?.response) {
      console.log('[LOG] Cache hit')
      return new Response(JSON.stringify(cachedResponse.response), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Prepare chat history
    const history: Message[] = []
    if (Array.isArray(body.chat_history)) {
      for (const msg of body.chat_history) {
        if (isValidChatMessage(msg)) {
          history.push(msg)
        }
      }
    }
    history.push({ role: 'user', content: query })

    // Tool definition for search_products
    const searchTool = {
      function: {
        name: 'search_products',
        description: 'Search internal products database',
        parameters: {
          type: 'object',
          properties: {
            search_term: { type: 'string', description: 'Search query for products' },
          },
          required: ['search_term'],
        },
      },
    }

    // Global abort controller for timeout
    const globalController = new AbortController()
    const globalTimeout = setTimeout(() => globalController.abort(), GLOBAL_TIMEOUT_MS)

    // First AI call: attempt to get tool call
    let toolCallResult: { searchTerm: string } | null = null
    let firstProviderUsed: (typeof providers)[0] | null = null

    let lastProviderError: any = null;
    let lastFailedProvider: string = '';
    let toolCallResult: { searchTerm: string } | null = null;
    let firstProviderUsed: typeof providers[0] | null = null;

    for (const provider of providers) {
      const circuitBreaker = getCircuitBreaker(provider.provider_name)
      if (circuitBreaker.isOpen()) {
        console.log(`[LOG] Circuit breaker open for ${provider.provider_name}`)
        continue
      }

      const cap = PROVIDER_CAPABILITIES[provider.provider_name]
      if (!cap) continue

      // Attempt with retries
      let attempt = 0
      const maxAttempts = 3
      let success = false
      while (attempt < maxAttempts && !success) {
        attempt++
        const tryController = new AbortController()
        const tryTimeout = setTimeout(() => tryController.abort(), PER_TRIAL_TIMEOUT_MS)
        // Combine signals if possible
        const signal =
          typeof AbortSignal.any === 'function'
            ? AbortSignal.any([globalController.signal, tryController.signal])
            : tryController.signal

        const apiKey = provider.api_key_secret_name
          ? Deno.env.get(provider.api_key_secret_name)
          : undefined
        const endpoint = getProviderEndpoint(
          provider.provider_name,
          provider.custom_endpoint,
          apiKey,
        )

        const requestBody = buildRequestBody(
          provider.provider_name,
          systemPrompt,
          history.slice(-1), // send only last message for first call
          true,
          searchTool,
        )

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (cap.authType === 'bearer' && apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`
        } else if (cap.authType === 'x-api-key' && apiKey) {
          headers['x-api-key'] = apiKey
        }

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal,
          })

          clearTimeout(tryTimeout)

          if (response.status === 429 || response.status >= 500) {
            // Backoff
            if (attempt < maxAttempts) {
              const delay = attempt === 1 ? 300 : 700
              await new Promise((resolve) => setTimeout(resolve, delay))
              continue
            } else {
              circuitBreaker.recordFailure()
              break
            }
          }

          if (!response.ok) {
            circuitBreaker.recordFailure()
            break
          }

          const rawData = await response.json()
          const normalized = normalizeProviderResponse(provider.provider_name, rawData)

          if (normalized.toolCalls.length > 0) {
            const toolCall = normalized.toolCalls[0]
            if (toolCall.function.name === 'search_products') {
              const args = JSON.parse(toolCall.function.arguments)
              toolCallResult = { searchTerm: args.search_term || query }
              firstProviderUsed = provider
              circuitBreaker.recordSuccess()
              success = true
              break
            }
          }

          // If no tool call but content, treat as fallback
          circuitBreaker.recordSuccess()
          success = true
          break
      } catch (e: any) {
        clearTimeout(tryTimeout);
        
        // CAPTURA O ERRO REAL
        lastProviderError = e;
        lastFailedProvider = provider.provider_name;
        console.error(`[ERROR] Provider ${provider.provider_name} failed:`, e?.message || String(e));
        
        if (e instanceof DOMException && e.name === 'AbortError') {
          circuitBreaker.recordFailure();
          break; // timeout da tentativa, não tenta mais neste provider
        }
        
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          circuitBreaker.recordFailure();
        }
      }
      
      if (success) break;
    }

    if (!toolCallResult) {
      clearTimeout(globalTimeout);
      console.error('[FATAL] All providers failed. Last error:', lastProviderError?.message || 'Unknown');
      return new Response(
        JSON.stringify({ 
          error: lastProviderError?.message || 'All AI providers failed',
          provider: lastFailedProvider || 'none',
          type: lastProviderError?.constructor?.name || 'Error'
        }), 
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PERF] AI_CALL_1 completed')

    // Execute RPC
    const { data: rpcResults, error: rpcError } = await supabase.rpc('search_products_v2', {
      search_term: toolCallResult.searchTerm,
      boost_multiplier: 1.0,
    })

    if (rpcError) {
      clearTimeout(globalTimeout)
      console.error('[ERROR] RPC failed:', rpcError)
      return new Response(JSON.stringify({ error: 'Search failed' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    console.log('[PERF] RPC_SEARCH completed')

    const rawProducts: unknown[] = Array.isArray(rpcResults)
      ? rpcResults.slice(0, MAX_PRODUCTS_FROM_RPC)
      : []
    const products: ProductRecord[] = []
    for (const raw of rawProducts) {
      const validated = validateProductRecord(raw)
      if (validated) {
        products.push(validated)
      }
    }

    // Enrich and compact
    const enrichedProducts = products.slice(0, MAX_PRODUCTS_IN_PROMPT).map((p) => ({
      id: p.id,
      name: sanitizeForLLM(p.name),
      description: sanitizeForLLM(p.description),
      price_brl: p.price_brl,
      price_usd: p.price_usd,
      stock: p.stock,
      category: p.category,
      image_url: p.image_url,
      manufacturer_id: p.manufacturer_id,
      final_rank: p.final_rank,
      factual_specs: Object.fromEntries(
        Object.entries(p.pc).map(([k, v]) => [k, sanitizeForLLM(v.value)]),
      ),
      market_context: p.mi.map((m: any) => sanitizeForLLM(m)),
      technical_specs: p.psc.map((s: any) => sanitizeForLLM(s)),
    }))

    // Context truncation
    let productsJson = JSON.stringify(enrichedProducts)
    if (productsJson.length > MAX_CONTEXT_CHARS) {
      // Truncate descriptions and arrays
      let modified = enrichedProducts.map((p) => ({
        ...p,
        description: p.description.slice(0, 200),
        market_context: p.market_context.slice(0, 3),
        technical_specs: p.technical_specs.slice(0, 3),
      }))
      productsJson = JSON.stringify(modified)
      if (productsJson.length > MAX_CONTEXT_CHARS) {
        productsJson = productsJson.slice(0, MAX_CONTEXT_CHARS)
      }
    }

    // Second AI call: final response
    let finalResponse: AIResponseSchema | null = null
    let secondProviderUsed = firstProviderUsed || providers[0]

    for (const provider of firstProviderUsed
      ? [firstProviderUsed, ...providers.filter((p) => p.id !== firstProviderUsed!.id)]
      : providers) {
      const circuitBreaker = getCircuitBreaker(provider.provider_name)
      if (circuitBreaker.isOpen()) continue

      const cap = PROVIDER_CAPABILITIES[provider.provider_name]
      if (!cap) continue

      const tryController = new AbortController()
      const tryTimeout = setTimeout(() => tryController.abort(), PER_TRIAL_TIMEOUT_MS)
      const signal =
        typeof AbortSignal.any === 'function'
          ? AbortSignal.any([globalController.signal, tryController.signal])
          : tryController.signal

      const apiKey = provider.api_key_secret_name
        ? Deno.env.get(provider.api_key_secret_name)
        : undefined
      const endpoint = getProviderEndpoint(provider.provider_name, provider.custom_endpoint, apiKey)

      const userMessage = `Com base nos seguintes produtos, responda à pergunta do usuário: "${query}". Produtos: ${productsJson}`
      const messagesForSecond = [...history.slice(0, -1), { role: 'user', content: userMessage }]

      const requestBody = buildRequestBody(
        provider.provider_name,
        systemPrompt,
        messagesForSecond,
        false,
      )

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (cap.authType === 'bearer' && apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      } else if (cap.authType === 'x-api-key' && apiKey) {
        headers['x-api-key'] = apiKey
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal,
        })
        clearTimeout(tryTimeout)

        if (!response.ok) {
          circuitBreaker.recordFailure()
          continue
        }

        const rawData = await response.json()
        const normalized = normalizeProviderResponse(provider.provider_name, rawData)
        finalResponse = parseAIJson(normalized.content)

        if (finalResponse) {
          circuitBreaker.recordSuccess()
          secondProviderUsed = provider
          break
        } else {
          circuitBreaker.recordFailure()
        }
      } catch (e) {
        clearTimeout(tryTimeout)
        if (e instanceof DOMException && e.name === 'AbortError') {
          circuitBreaker.recordFailure()
          break
        }
        circuitBreaker.recordFailure()
      }
    }

    clearTimeout(globalTimeout)
    console.log('[PERF] AI_CALL_2 completed')

    if (!finalResponse) {
      return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Validate referenced products against actual results
    const validIds = new Set(products.map((p) => p.id))
    finalResponse.referenced_internal_products = finalResponse.referenced_internal_products.filter(
      (id) => validIds.has(id),
    )

    // Save PC and PSC (fire-and-forget)
    const saveTasks: Promise<unknown>[] = []

    // PC save
    for (const pcItem of finalResponse.pc_save_request) {
      if (
        !SPEC_KEY_REGEX.test(pcItem.spec_key) ||
        pcItem.spec_value.length > SPEC_VALUE_MAX_LENGTH ||
        pcItem.confidence < 0 ||
        pcItem.confidence > 1 ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pcItem.product_id)
      ) {
        continue
      }
      const sanitizedValue = sanitizeForLLM(pcItem.spec_value)
      const task = supabase
        .from('product_cache')
        .upsert(
          {
            product_id: pcItem.product_id,
            spec_key: pcItem.spec_key,
            spec_value: sanitizedValue,
            source: pcItem.source,
            confidence: pcItem.confidence,
            cached_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {},
          },
          { onConflict: 'product_id, spec_key' },
        )
        .then(() =>
          console.log(`[LOG] PC save success for ${pcItem.product_id}:${pcItem.spec_key}`),
        )
        .catch((e) => console.error(`[ERROR] PC save failed: ${e}`))
      saveTasks.push(task)
    }

    // PSC save
    const pscQueryHash = await hashQuery(query)
    for (const pscItem of finalResponse.psc_save_request) {
      const safeQuery = sanitizeInput(pscItem.search_query).slice(0, 200)
      const task = supabase
        .from('product_search_cache')
        .upsert(
          {
            search_query: safeQuery,
            product_specs: pscItem.product_specs,
            source: 'ai',
            created_by_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: 'search_query' },
        )
        .then(() => console.log(`[LOG] PSC save success for ${safeQuery}`))
        .catch((e) => console.error(`[ERROR] PSC save failed: ${e}`))
      saveTasks.push(task)
    }

    // Fire-and-forget using waitUntil if available, else just catch
    if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
      ;(globalThis as any).EdgeRuntime.waitUntil(Promise.allSettled(saveTasks))
    } else {
      Promise.allSettled(saveTasks).catch(() => {})
    }

    // Cache the response
    await supabase.from('ai_response_cache').upsert(
      {
        query_hash: cacheKey,
        response: finalResponse,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: 'query_hash' },
    )

    // Persist chat if session_id
    if (body.session_id) {
      const chatMessages = [
        { session_id: body.session_id, role: 'user', content: query },
        { session_id: body.session_id, role: 'assistant', content: finalResponse.message },
      ]
      supabase
        .from('chat_messages')
        .insert(chatMessages)
        .then(() => {})
        .catch(() => {})
    }

    console.log('[PERF] TOTAL_SUCCESS')

    const responseBody = {
      message: finalResponse.message,
      confidence_level: finalResponse.confidence_level,
      referenced_internal_products: finalResponse.referenced_internal_products,
      should_show_whatsapp_button: finalResponse.should_show_whatsapp_button,
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    clearTimeout(globalTimeout)
    console.error('[FATAL]', err?.message || String(err), err?.stack || '')

    return new Response(
      JSON.stringify({
        error: err?.message || 'Failed to process query',
        stack: err?.stack || '',
      }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})
