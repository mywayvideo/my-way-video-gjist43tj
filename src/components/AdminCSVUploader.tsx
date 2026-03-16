import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Manufacturer } from '@/types'
import { AdminManufacturerDialog } from './AdminManufacturerDialog'

interface Props {
  manufacturers: Manufacturer[]
  onSuccess: () => void
  onAddManufacturer: () => void
}

export function AdminCSVUploader({ manufacturers, onSuccess, onAddManufacturer }: Props) {
  const [selectedMfg, setSelectedMfg] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [showMfgDialog, setShowMfgDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!selectedMfg) {
      toast({
        title: 'Atenção',
        description: 'Selecione um fabricante para o lote.',
        variant: 'destructive',
      })
      return
    }

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
        const validProducts = lines
          .slice(1)
          .map((line) => {
            const values = line.split(',')
            const prod: any = { manufacturer_id: selectedMfg }
            headers.forEach((h, i) => {
              let val = values[i]?.trim() || null
              if (h === 'sku' && val) val = val.replace(/[-/]/g, '')
              if (['price_brl', 'price_usd', 'price_cost', 'stock', 'weight'].includes(h)) {
                prod[h] = val ? parseFloat(val) : 0
              } else if (h === 'is_special') {
                prod[h] = val === 'true' || val === '1' || val?.toLowerCase() === 'sim'
              } else {
                prod[h] = val
              }
            })
            return prod
          })
          .filter((p) => p.name && p.sku)

        const { error } = await supabase
          .from('products')
          .upsert(validProducts, { onConflict: 'manufacturer_id,sku' })
        if (error) throw error

        toast({ title: 'Sucesso', description: `${validProducts.length} produtos importados.` })
        if (fileInputRef.current) fileInputRef.current.value = ''
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
    <div className="flex items-center gap-2">
      <Select value={selectedMfg} onValueChange={setSelectedMfg}>
        <SelectTrigger className="w-[180px] bg-background border-white/10">
          <SelectValue placeholder="Lote do Fabricante..." />
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
        variant="outline"
        size="icon"
        onClick={() => setShowMfgDialog(true)}
        className="border-white/10 hover:bg-white/5"
      >
        <Plus className="w-4 h-4" />
      </Button>
      <div className="relative overflow-hidden inline-block ml-2">
        <Button
          variant="secondary"
          disabled={isUploading || !selectedMfg}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Processando...' : 'Importar CSV'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          className="hidden"
        />
      </div>
      <AdminManufacturerDialog
        open={showMfgDialog}
        onOpenChange={setShowMfgDialog}
        onSuccess={(id) => {
          onAddManufacturer()
          setSelectedMfg(id)
        }}
      />
    </div>
  )
}
