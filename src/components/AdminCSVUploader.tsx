import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Manufacturer } from '@/types'

interface Props {
  manufacturers: Manufacturer[]
  onSuccess: () => void
  onAddManufacturer: () => void
}

export function AdminCSVUploader({ manufacturers, onSuccess, onAddManufacturer }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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
        const mfgIndex = headers.indexOf('manufacturer')

        let validProducts: any[] = []
        let missingManufacturers = new Set<string>()

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

        if (mfgIndex !== -1) {
          const existingMfgNames = new Map(manufacturers.map((m) => [m.name.toLowerCase(), m.id]))
          parsedLines.forEach((p) => {
            const mfgName = p.manufacturer
            if (mfgName && !existingMfgNames.has(mfgName.toLowerCase())) {
              missingManufacturers.add(mfgName)
            }
          })

          const newMfgMap = new Map<string, string>()
          if (missingManufacturers.size > 0) {
            const newMfgsToInsert = Array.from(missingManufacturers).map((name) => ({ name }))
            const { data: insertedMfgs, error: mfgError } = await supabase
              .from('manufacturers')
              .insert(newMfgsToInsert)
              .select()

            if (mfgError) throw new Error(`Erro ao criar fabricantes: ${mfgError.message}`)
            if (insertedMfgs) {
              insertedMfgs.forEach((m) => newMfgMap.set(m.name.toLowerCase(), m.id))
              onAddManufacturer()
            }
          }

          validProducts = parsedLines.map((p) => {
            const mfgName = p.manufacturer
            let mfgId = null
            if (mfgName) {
              const lowerName = mfgName.toLowerCase()
              mfgId = existingMfgNames.get(lowerName) || newMfgMap.get(lowerName)
            }
            const { manufacturer, ...rest } = p
            return { ...rest, manufacturer_id: mfgId }
          })
        } else {
          validProducts = parsedLines
        }

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
      <div className="relative overflow-hidden inline-block ml-2">
        <Button
          variant="secondary"
          disabled={isUploading}
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
    </div>
  )
}
