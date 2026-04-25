import React, { useMemo } from 'react'
import { ResponseFormatter as BaseResponseFormatter } from '@/components/AI/ResponseFormatter'

interface ResponseFormatterProps {
  message?: string
  content?: string
  stock?: any[]
  referenced_internal_products?: string[]
  products?: any[]
  [key: string]: any
}

export function ResponseFormatter(props: ResponseFormatterProps) {
  const {
    referenced_internal_products,
    stock,
    message,
    content,
    products: _propsProducts,
    ...rest
  } = props

  const textContent = message || content || ''

  const filteredProducts = useMemo(() => {
    const stockItems = Array.isArray(stock) ? stock : []
    const refIds = Array.isArray(referenced_internal_products) ? referenced_internal_products : []

    if (stockItems.length === 0) return []

    // Priority: Filter 'stock' results where product.id is included in 'referencedIds'
    let matches = stockItems.filter((p) => refIds.includes(p.id))

    // Fallback: If Priority results are empty, filter 'stock' by matching product.name or product.model with the message text
    if (matches.length === 0 && textContent) {
      const lowerText = textContent.toLowerCase()
      matches = stockItems.filter((p) => {
        const nameMatch = p.name && lowerText.includes(p.name.toLowerCase())
        const modelMatch =
          (p.sku || p.model) && lowerText.includes((p.sku || p.model).toLowerCase())
        return nameMatch || modelMatch
      })
    }

    // Remove duplicates
    return matches.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
  }, [referenced_internal_products, stock, textContent])

  return (
    <BaseResponseFormatter
      {...rest}
      message={textContent}
      content={textContent}
      stock={stock}
      referenced_internal_products={referenced_internal_products}
      products={filteredProducts}
    />
  )
}
