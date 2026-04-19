import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface SearchStatusProps {
  hasNabIntelligence?: boolean
  className?: string
}

export function SearchStatus({ hasNabIntelligence, className }: SearchStatusProps) {
  if (!hasNabIntelligence) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
        <Sparkles className="h-3 w-3" />
        Fonte: Inteligência NAB 2026
      </span>
    </div>
  )
}
