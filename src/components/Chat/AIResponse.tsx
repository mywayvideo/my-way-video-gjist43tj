import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '@/components/ui/card'

interface Product {
  id: string
  name?: string
  model?: string
  sku?: string
  price_usa?: number | string
  price_brl?: number | string
  image_url?: string
  ncm?: string
  [key: string]: any
}

interface SearchResults {
  stock?: Product[]
  referenced_internal_products?: string[]
  [key: string]: any
}

interface Message {
  text?: string
  content?: string
  referenced_internal_products?: string[]
  [key: string]: any
}

interface AIResponseProps {
  message: Message
  search_results: SearchResults
}

export function getMentionedProducts(text: string, stock: Product[], referencedIds: string[] = []) {
  if (!stock || !Array.isArray(stock)) return []

  const uniqueStock = Array.from(new Map(stock.map((p) => [p.id, p])).values())
  const validRefs = (referencedIds || []).filter((ref) => typeof ref === 'string')
  const lowerText = (text || '').toLowerCase()

  const TECHNICAL_POWER_TERMS = new Set([
    '12g',
    '4k',
    '8k',
    'sfp',
    'sdi',
    'fiber',
    'fibra',
    'optical',
    '6k',
    'uhd',
    'hdmi',
    'wireless',
    'ndiv',
    'ptz',
  ])
  const STOP_WORDS = new Set([
    'que',
    'qual',
    'como',
    'para',
    'por',
    'com',
    'uma',
    'um',
    'tem',
    'temos',
    'voces',
    'voce',
    'mostrar',
    'mostre',
    'quero',
    'gostaria',
    'saber',
    'preco',
    'valor',
    'sobre',
    'esse',
    'essa',
    'este',
    'esta',
    'aqui',
    'ali',
    'the',
    'what',
    'who',
    'how',
    'why',
    'can',
    'you',
    'show',
    'tell',
    'about',
    'price',
    'cost',
    'favor',
    'poderia',
    'quais',
  ])

  const words = lowerText.replace(/[^\w\s-]/g, ' ').split(/\s+/)
  const coreKeywords = words.filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  const foundPowerTerms = words.filter((w) => TECHNICAL_POWER_TERMS.has(w))

  const filtered = uniqueStock.filter((product) => {
    const isIdMatch = validRefs.includes(product.id)
    if (isIdMatch) return true

    let strictMatchFailed = false
    if (foundPowerTerms.length > 0) {
      const pText =
        `${product.name} ${product.model} ${product.sku} ${product.description || ''} ${product.technical_info || ''}`.toLowerCase()
      for (const term of foundPowerTerms) {
        if (!pText.includes(term)) {
          strictMatchFailed = true
          break
        }
      }
    }

    if (strictMatchFailed) return false

    let affinityScore = 0
    const pText = `${product.name} ${product.model} ${product.sku}`.toLowerCase()

    for (const kw of coreKeywords) {
      if (pText.includes(kw)) {
        affinityScore++
      }
    }

    const skuLower = (product.sku || '').toLowerCase()
    const isSkuMatch =
      skuLower.length > 3 &&
      (lowerText.includes(skuLower) ||
        (skuLower.includes('-') &&
          skuLower.split('-').some((p) => p.length >= 3 && lowerText.includes(p))))

    const modelLower = (product.model || '').toLowerCase()
    const isModelMatch =
      modelLower.length > 3 &&
      (lowerText.includes(modelLower) ||
        (modelLower.includes('-') &&
          modelLower.split('-').some((p) => p.length >= 3 && lowerText.includes(p))))

    const nameLower = (product.name || '').toLowerCase()
    const isNameMatch = nameLower.length > 10 && lowerText.includes(nameLower)

    return affinityScore > 0 || isSkuMatch || isModelMatch || isNameMatch
  })

  return filtered.sort((a, b) => {
    const isIdMatchA = validRefs.includes(a.id)
    const isIdMatchB = validRefs.includes(b.id)
    if (isIdMatchA && !isIdMatchB) return -1
    if (isIdMatchB && !isIdMatchA) return 1

    let affinityA = 0
    let affinityB = 0
    const pTextA = `${a.name} ${a.model} ${a.sku}`.toLowerCase()
    const pTextB = `${b.name} ${b.model} ${b.sku}`.toLowerCase()

    for (const kw of coreKeywords) {
      if (pTextA.includes(kw)) affinityA++
      if (pTextB.includes(kw)) affinityB++
    }

    if (affinityB !== affinityA) return affinityB - affinityA

    const aNameIdx = a.name ? lowerText.indexOf(a.name.toLowerCase()) : -1
    const aModelIdx = a.model || a.sku ? lowerText.indexOf((a.model || a.sku).toLowerCase()) : -1

    const bNameIdx = b.name ? lowerText.indexOf(b.name.toLowerCase()) : -1
    const bModelIdx = b.model || b.sku ? lowerText.indexOf((b.model || b.sku).toLowerCase()) : -1

    const aIdx = Math.min(
      aNameIdx !== -1 ? aNameIdx : Infinity,
      aModelIdx !== -1 ? aModelIdx : Infinity,
    )

    const bIdx = Math.min(
      bNameIdx !== -1 ? bNameIdx : Infinity,
      bModelIdx !== -1 ? bModelIdx : Infinity,
    )

    return aIdx - bIdx
  })
}

export function AIResponse({ message, search_results }: AIResponseProps) {
  const stock = search_results?.stock || []
  const text = message?.text || message?.content || ''
  const referencedIds =
    message?.referenced_internal_products || search_results?.referenced_internal_products || []

  const mentionedProducts = getMentionedProducts(text, stock, referencedIds)

  return (
    <div className="flex flex-col space-y-4">
      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {text}
      </ReactMarkdown>

      {mentionedProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {mentionedProducts.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name || 'Produto'}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">
                    Sem Imagem
                  </div>
                )}
              </div>
              <CardContent className="p-3 flex flex-col flex-grow">
                <div className="text-xs text-muted-foreground mb-1 line-clamp-1">
                  {product.model || product.sku || 'N/A'}
                </div>
                <h4 className="font-medium text-sm line-clamp-2 mb-2 flex-grow">{product.name}</h4>
                <div className="flex flex-col space-y-1 mt-auto">
                  {product.price_usa && (
                    <span className="text-xs font-semibold text-primary">
                      USD $
                      {Number(product.price_usa).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                  {product.price_brl ? (
                    <span className="text-xs font-semibold text-green-600">
                      BRL R${' '}
                      {Number(product.price_brl).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sob Consulta</span>
                  )}
                  {product.ncm && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      NCM: {product.ncm}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
