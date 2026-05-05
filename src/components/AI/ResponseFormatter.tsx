import React from 'react'
import ReactMarkdown from 'react-markdown'
import { ProductCard } from '@/components/ProductCard'

interface ResponseFormatterProps {
  content: string
  products?: any[]
  stock?: any[]
  referenced_internal_products?: string[]
  nabData?: any[]
  intel?: any[]
}

export function ResponseFormatter({
  content,
  products,
  stock,
  referenced_internal_products,
}: ResponseFormatterProps) {
  let finalProducts = products || []

  if (finalProducts.length === 0 && stock && stock.length > 0) {
    const refs = referenced_internal_products || []
    let filtered = stock.filter((p: any) => refs.includes(p.id))

    if (filtered.length === 0 && content) {
      const lowerContent = content.toLowerCase()
      filtered = stock.filter((p: any) => {
        const nameMatch = p.name && lowerContent.includes(p.name.toLowerCase())
        const modelMatch = p.sku && lowerContent.includes(p.sku.toLowerCase())
        return nameMatch || modelMatch
      })
    }
    finalProducts = filtered
  }

  finalProducts = finalProducts.filter(
    (v: any, i: number, a: any[]) => a.findIndex((t) => t.id === v.id) === i,
  )

  const renderContentWithTables = (text: string) => {
    if (!text) return null

    const lines = text.split('\n')
    const blocks: React.ReactNode[] = []
    let currentText: string[] = []
    let inCodeBlock = false
    let inTable = false
    let tableLines: string[] = []

    const flushText = () => {
      if (currentText.length > 0) {
        blocks.push(
          <ReactMarkdown
            key={`text-${blocks.length}`}
            className="prose prose-invert max-w-none text-white/90 [&_p]:whitespace-pre-wrap [&_li]:whitespace-normal"
          >
            {currentText.join('\n')}
          </ReactMarkdown>,
        )
        currentText = []
      }
    }

    const renderTable = (tLines: string[], key: number) => {
      if (tLines.length < 2) return null

      const parseRow = (row: string) => {
        const clean = row.trim()
        const inner = clean.replace(/^\|/, '').replace(/\|$/, '')
        return inner.split('|').map((c) => c.trim())
      }

      const headers = parseRow(tLines[0])
      // tLines[1] is the separator
      const rows = tLines.slice(2).map(parseRow)

      return (
        <div
          key={`table-${key}`}
          className="w-full max-w-full overflow-x-auto my-6 border border-white/10 rounded-xl shadow-lg bg-black/40 backdrop-blur-sm"
        >
          <table
            className="w-full text-sm text-left border-collapse"
            style={{ minWidth: 'max-content' }}
          >
            <thead>
              <tr className="bg-white/5">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-6 py-4 font-semibold text-primary border-b border-white/10 whitespace-nowrap"
                  >
                    <ReactMarkdown components={{ p: ({ children }) => <>{children}</> }}>
                      {h}
                    </ReactMarkdown>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-6 py-4 text-white/80 whitespace-nowrap">
                      <ReactMarkdown components={{ p: ({ children }) => <>{children}</> }}>
                        {cell}
                      </ReactMarkdown>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        currentText.push(line)
        continue
      }

      if (inCodeBlock) {
        currentText.push(line)
        continue
      }

      const isTableLine = line.trim().startsWith('|') && line.trim().split('|').length > 2

      if (isTableLine) {
        if (!inTable) {
          const nextLine = lines[i + 1]
          if (nextLine && nextLine.trim().startsWith('|') && nextLine.includes('---')) {
            flushText()
            inTable = true
            tableLines.push(line)
          } else {
            currentText.push(line)
          }
        } else {
          tableLines.push(line)
        }
      } else {
        if (inTable) {
          blocks.push(renderTable(tableLines, blocks.length))
          tableLines = []
          inTable = false
        }
        currentText.push(line)
      }
    }

    if (inTable) {
      blocks.push(renderTable(tableLines, blocks.length))
    }
    flushText()

    return <div className="space-y-4">{blocks}</div>
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {content && <div className="w-full max-w-full">{renderContentWithTables(content)}</div>}

      {finalProducts && finalProducts.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalProducts.map((product: any, index: number) => (
              <React.Fragment key={product.id || index}>
                <ProductCard product={product} />
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
