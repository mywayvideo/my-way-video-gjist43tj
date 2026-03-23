import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, Plus, CheckCircle2 } from 'lucide-react'
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

interface ReportData {
  operation: 'CREATE' | 'UPDATE' | null
  totalRows: number
  validRows: any[]
  invalidRows: { row: number; sku: string; reason: string }[]
  duplicates: { row: number; incomingSku: string; dbSku: string }[]
  dbIdsMap?: Record<string, string>
}

const normalizeSkuForComparison = (sku: string) => {
  return sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

export function AdminCSVUploader({ manufacturers, onSuccess, onAddManufacturer }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'SELECT' | 'REPORT'>('SELECT')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [mfgId, setMfgId] = useState<string>('')
  const [showMfgDialog, setShowMfgDialog] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)

  const handleReset = () => {
    setFile(null)
    setReport(null)
    setStep('SELECT')
    if (!isUploading && !isAnalyzing) setOpen(false)
  }

  const analyzeFile = async () => {
    if (!file || !mfgId) return
    setIsAnalyzing(true)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        if (lines.length < 2) throw new Error('CSV inválido ou vazio')

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
        const hasSku = headers.includes('sku')
        let operation: 'CREATE' | 'UPDATE' | null = null

        if (hasSku && headers.includes('name') && headers.includes('description')) {
          operation = 'CREATE'
        } else if (hasSku && headers.length > 1) {
          operation = 'UPDATE'
        } else if (hasSku && headers.length === 1) {
          throw new Error(
            'Arquivo invalido. SKU sozinho nao e permitido. Use criacao (SKU+nome+descricao) ou atualizacao (SKU+coluna)',
          )
        } else {
          throw new Error(
            'Arquivo invalido. Colunas obrigatorias para criacao: sku, name, description',
          )
        }

        const { data: existingProducts, error: dbError } = await supabase
          .from('products')
          .select('id, sku')
          .eq('manufacturer_id', mfgId)
        if (dbError) throw dbError

        const skuMap = new Map<string, { id: string; sku: string }>()
        existingProducts.forEach((p) => {
          if (p.sku) skuMap.set(normalizeSkuForComparison(p.sku), { id: p.id, sku: p.sku })
        })

        const validRows: any[] = []
        const invalidRows: { row: number; sku: string; reason: string }[] = []
        const duplicates: { row: number; incomingSku: string; dbSku: string }[] = []
        const dbIdsMap: Record<string, string> = {}

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          const values = line
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((v) => v.replace(/^"|"$/g, '').trim())
          const rowData: any = {}
          let rowSku = ''

          headers.forEach((h, index) => {
            let val = values[index] || null
            rowData[h] = val
            if (h === 'sku') rowSku = val || ''
          })

          if (!rowSku) {
            invalidRows.push({ row: i + 1, sku: 'VAZIO', reason: 'SKU ausente' })
            continue
          }

          try {
            const normalizedSku = normalizeSkuForComparison(rowSku)
            const existing = skuMap.get(normalizedSku)

            if (operation === 'CREATE') {
              if (!rowData.name || !rowData.description) {
                invalidRows.push({ row: i + 1, sku: rowSku, reason: 'Nome ou descricao ausentes' })
                continue
              }
              if (existing) {
                duplicates.push({ row: i + 1, incomingSku: rowSku, dbSku: existing.sku })
                invalidRows.push({ row: i + 1, sku: rowSku, reason: 'SKU ja existe' })
                continue
              }
              validRows.push(rowData)
            } else if (operation === 'UPDATE') {
              if (!existing) {
                invalidRows.push({ row: i + 1, sku: rowSku, reason: 'SKU nao encontrado' })
                continue
              }
              dbIdsMap[rowSku] = existing.id
              validRows.push(rowData)
            }
          } catch (err) {
            invalidRows.push({ row: i + 1, sku: rowSku, reason: 'Erro ao normalizar SKU' })
          }
        }

        setReport({
          operation,
          totalRows: lines.length - 1,
          validRows,
          invalidRows,
          duplicates,
          dbIdsMap,
        })
        setStep('REPORT')
      } catch (err: any) {
        toast({
          title: 'Erro na validacao. Verifique o arquivo.',
          description: err.message,
          variant: 'destructive',
        })
        setFile(null)
      } finally {
        setIsAnalyzing(false)
      }
    }
    reader.readAsText(file)
  }

  const processImport = async () => {
    if (!report || report.validRows.length === 0) return
    setIsUploading(true)
    setProgressMsg('Importando produtos...')

    try {
      const productsToUpsert = report.validRows.map((p) => {
        const prod: any = { manufacturer_id: mfgId }
        Object.entries(p).forEach(([h, val]: [string, any]) => {
          const targetKey = h === 'price_usa' ? 'price_usd' : h
          if (['price_brl', 'price_usd', 'price_cost', 'stock', 'weight'].includes(targetKey)) {
            prod[targetKey] = val ? parseFloat(val) : 0
          } else if (targetKey === 'is_special') {
            prod[targetKey] = val === 'true' || val === '1' || val?.toLowerCase() === 'sim'
          } else if (targetKey === 'technical_info') {
            prod[targetKey] = val && val.trim() !== '' ? String(val) : null
          } else if (targetKey !== 'manufacturer' && targetKey !== 'manufacturer_id') {
            prod[targetKey] = val
          }
        })
        return prod
      })

      if (report.operation === 'UPDATE') {
        for (const prod of productsToUpsert) {
          const { sku, manufacturer_id, ...updates } = prod
          const dbId = report.dbIdsMap?.[sku]
          if (!dbId) continue
          const { error } = await supabase.from('products').update(updates).eq('id', dbId)
          if (error) throw error
        }
      } else {
        const { error } = await supabase.from('products').insert(productsToUpsert)
        if (error) throw error
      }

      toast({
        title: 'Sucesso',
        description: `${productsToUpsert.length} produtos importados com sucesso.`,
      })
      handleReset()
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao importar. Tente novamente.',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setProgressMsg('')
    }
  }

  const downloadReport = () => {
    if (!report) return
    const headers = ['Linha', 'SKU Recebido', 'SKU Banco', 'Status', 'Motivo']
    const rows = report.validRows.map((r) => `"", "${r.sku}", "", "Valido", "Pronto"`)
    report.invalidRows.forEach((r) => {
      const dup = report.duplicates.find((d) => d.row === r.row)
      rows.push(`"${r.row}", "${r.sku}", "${dup ? dup.dbSku : ''}", "Invalido", "${r.reason}"`)
    })
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `relatorio-importacao-${Date.now()}.csv`
    link.click()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) handleReset()
          else setOpen(true)
        }}
      >
        <DialogTrigger asChild>
          <Button variant="secondary">
            <Upload className="w-4 h-4 mr-2" /> Importar CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Importar Catálogo</DialogTitle>
          </DialogHeader>

          {step === 'SELECT' ? (
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
          ) : (
            report && (
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> Relatório de Validação
                  </h3>
                  <p className="text-sm">
                    Operação:{' '}
                    <strong>{report.operation === 'CREATE' ? 'Criação' : 'Atualização'}</strong>
                  </p>
                  <p className="text-sm">
                    Total de linhas: <strong>{report.totalRows}</strong>
                  </p>
                  <p className="text-sm text-green-500">
                    Linhas válidas: <strong>{report.validRows.length}</strong>
                  </p>
                  <p className="text-sm text-red-500">
                    Linhas inválidas: <strong>{report.invalidRows.length}</strong>
                  </p>
                </div>

                {report.invalidRows.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Problemas Encontrados:</h4>
                    <div className="text-xs space-y-1 bg-destructive/10 p-3 rounded-md border border-destructive/20 max-h-40 overflow-y-auto">
                      {report.invalidRows.map((inv, idx) => {
                        const dup = report.duplicates.find((d) => d.row === inv.row)
                        return (
                          <div key={idx} className="flex gap-2">
                            <span className="font-mono w-8 shrink-0">L{inv.row}</span>
                            <span
                              className="font-mono text-muted-foreground w-20 truncate"
                              title={inv.sku}
                            >
                              {inv.sku}
                            </span>
                            <span className="text-destructive font-medium">- {inv.reason}</span>
                            {dup && (
                              <span className="text-muted-foreground">(Conflito: {dup.dbSku})</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={downloadReport} className="w-full">
                  Baixar Relatório (CSV)
                </Button>
              </div>
            )
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={handleReset} disabled={isUploading || isAnalyzing}>
              Cancelar
            </Button>
            {step === 'SELECT' ? (
              <Button onClick={analyzeFile} disabled={isAnalyzing || !file || !mfgId}>
                {isAnalyzing ? 'Analisando...' : 'Analisar Arquivo'}
              </Button>
            ) : (
              <Button
                onClick={processImport}
                disabled={isUploading || report?.validRows.length === 0}
              >
                {isUploading ? progressMsg || 'Processando...' : 'Confirmar Importação'}
              </Button>
            )}
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
