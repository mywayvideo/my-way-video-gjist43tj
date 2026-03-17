import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Manufacturer } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { AdminManufacturerDialog } from './AdminManufacturerDialog'

interface Props {
  manufacturers: Manufacturer[]
  onSuccess: () => void
  onAddManufacturer: () => void
}

export function AdminCSVUploader({ manufacturers, onSuccess, onAddManufacturer }: Props) {
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mfgId, setMfgId] = useState<string>('')
  const [showMfgDialog, setShowMfgDialog] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const processUpload = async () => {
    if (!file || !mfgId) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        if (lines.length < 2) throw new Error('CSV inválido')

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

        const parsedLines = lines
          .slice(1)
          .map((line) => {
            const values = line
              .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
              .map((v) => v.replace(/^"|"$/g, '').trim())
            const prod: any = {}
            headers.forEach((h, i) => {
              let val = values[i] || null
              if (h === 'sku' && val) val = val.replace(/[-/]/g, '')

              const targetKey = h === 'price_usa' ? 'price_usd' : h

              if (['price_brl', 'price_usd', 'price_cost', 'stock', 'weight'].includes(targetKey)) {
                prod[targetKey] = val ? parseFloat(val) : 0
              } else if (targetKey === 'is_special') {
                prod[targetKey] = val === 'true' || val === '1' || val?.toLowerCase() === 'sim'
              } else {
                prod[targetKey] = val
              }
            })
            return prod
          })
          .filter((p) => p.name && p.sku)

        // Assign the selected manufacturer to ALL products in the CSV
        const validProducts = parsedLines.map((p) => {
          const { manufacturer, manufacturer_id, ...rest } = p
          return { ...rest, manufacturer_id: mfgId }
        })

        if (validProducts.length === 0) {
          throw new Error('Nenhum produto válido encontrado. Preencha "name" e "sku".')
        }

        const { error } = await supabase
          .from('products')
          .upsert(validProducts, { onConflict: 'manufacturer_id,sku' })
        if (error) throw error

        toast({ title: 'Sucesso', description: `${validProducts.length} produtos importados.` })
        setFile(null)
        setMfgId('')
        setOpen(false)
        onSuccess()
      } catch (err: any) {
        toast({ title: 'Erro de Importação', description: err.message, variant: 'destructive' })
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary">
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Importar Catálogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>1. Selecione o Fabricante</Label>
              <div className="flex gap-2">
                <Select value={mfgId} onValueChange={setMfgId}>
                  <SelectTrigger className="bg-background/50 border-white/10 flex-1">
                    <SelectValue placeholder="Escolha um fabricante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowMfgDialog(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os produtos deste CSV serão vinculados a esta marca.
              </p>
            </div>

            <div className="space-y-2">
              <Label>2. Selecione o Arquivo CSV</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="bg-background/50 cursor-pointer file:cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button onClick={processUpload} disabled={isUploading || !file || !mfgId}>
              {isUploading ? 'Processando...' : 'Importar Produtos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AdminManufacturerDialog
        open={showMfgDialog}
        onOpenChange={setShowMfgDialog}
        onSuccess={(id) => {
          onAddManufacturer()
          setMfgId(id)
          setShowMfgDialog(false)
        }}
      />
    </>
  )
}
