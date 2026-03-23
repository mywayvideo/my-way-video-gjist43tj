import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Database } from 'lucide-react'

interface SearchTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: 'ai' | 'database') => void
}

export function SearchTypeDialog({ open, onOpenChange, onSelect }: SearchTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-xl font-semibold mb-2">Como deseja pesquisar?</DialogTitle>
        <div className="flex flex-col gap-4 mt-2">
          <Button
            variant="outline"
            className="h-16 text-lg justify-start px-6 gap-4 w-full transition-colors hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
            onClick={() => onSelect('ai')}
          >
            <Sparkles className="w-6 h-6" />
            Buscar com IA
          </Button>
          <Button
            variant="outline"
            className="h-16 text-lg justify-start px-6 gap-4 w-full transition-colors hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-500"
            onClick={() => onSelect('database')}
          >
            <Database className="w-6 h-6" />
            Buscar no Catálogo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
