import React from 'react'
import { cn } from '@/lib/utils'

interface ResponseFormatterProps {
  content: string
  className?: string
}

export function ResponseFormatter({ content, className }: ResponseFormatterProps) {
  if (!content) return null

  const lines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let currentList: React.ReactNode[] = []
  let blockKey = 0

  const parseInlineText = (text: string) => {
    // Split by **text** to extract bold segments
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push(
        <ul
          key={`list-${blockKey++}`}
          className="ml-6 space-y-2 list-disc marker:text-primary/70 mb-4 text-base"
        >
          {currentList}
        </ul>,
      )
      currentList = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === '') {
      flushList()
      continue
    }

    if (line.startsWith('-')) {
      const listItemContent = line.replace(/^-+\s*/, '')
      currentList.push(
        <li key={`li-${i}`} className="leading-relaxed pl-1 text-foreground/90">
          {parseInlineText(listItemContent)}
        </li>,
      )
    } else {
      flushList()

      // Detect section title: Starts with ** and ends with ** or **:
      const isTitle =
        line.startsWith('**') &&
        (line.endsWith('**') || line.endsWith('**:') || line.endsWith('** :'))

      if (isTitle) {
        blocks.push(
          <h3
            key={`h-${blockKey++}`}
            className="text-base md:text-lg font-semibold text-primary mt-6 mb-3 first:mt-0"
          >
            {parseInlineText(line.replace(/:$/, '').trim())}
          </h3>,
        )
      } else {
        blocks.push(
          <div
            key={`p-${blockKey++}`}
            className="text-sm md:text-base text-foreground/90 leading-[1.625] mb-4 last:mb-0"
          >
            {parseInlineText(line)}
          </div>,
        )
      }
    }
  }

  // Flush any remaining list items
  flushList()

  return <div className={cn('flex flex-col w-full', className)}>{blocks}</div>
}
