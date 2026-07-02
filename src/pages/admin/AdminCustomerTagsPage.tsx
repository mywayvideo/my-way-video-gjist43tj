import { useState, useEffect, useCallback } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { customerTaggingService, TaggedCustomer } from '@/services/customerTaggingService'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Eraser, ShieldAlert, RefreshCw, ScanLine } from 'lucide-react'

const reasonConfig: Record<
  string,
  { label: string; variant: 'destructive' | 'secondary' | 'outline' }
> = {
  invalid_format: { label: 'Formato Inválido', variant: 'destructive' },
  suspicious_alias: { label: 'Alias Suspeito', variant: 'secondary' },
  excessive_numbers: { label: 'Excesso de Números', variant: 'outline' },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminCustomerTagsPage() {
  const { toast } = useToast()
  const [records, setRecords] = useState<TaggedCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [scanning, setScanning] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const data = await customerTaggingService.fetchTagged(filter)
      setRecords(data)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
    setLoading(false)
  }, [filter, toast])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleScan = async () => {
    setScanning(true)
    try {
      const count = await customerTaggingService.runScan()
      toast({
        title: 'Varredura concluída',
        description: `${count} registro(s) suspeito(s) no total.`,
      })
      fetchRecords()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
    setScanning(false)
  }

  const handleRemoveCustomer = async (customerId: string, name: string) => {
    if (!confirm(`Remover o cliente "${name}"? Esta ação é irreversível.`)) return
    try {
      await customerTaggingService.removeCustomer(customerId)
      toast({ title: 'Sucesso', description: 'Cliente removido permanentemente.' })
      fetchRecords()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleClearTag = async (tagId: string) => {
    try {
      await customerTaggingService.clearTag(tagId)
      toast({ title: 'Sucesso', description: 'Tag ignorada e removida.' })
      fetchRecords()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <AdminLayout breadcrumb="Anti-Spam & Tags">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-primary" />
              Anti-Spam & Tags
            </h1>
            <p className="text-muted-foreground mt-2">
              Registros suspeitos identificados automaticamente no banco de dados de clientes.
            </p>
          </div>
          <Button onClick={handleScan} disabled={scanning}>
            {scanning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ScanLine className="w-4 h-4 mr-2" />
            )}
            {scanning ? 'Varrendo...' : 'Nova Varredura'}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filtrar por motivo:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="invalid_format">Formato Inválido</SelectItem>
              <SelectItem value="suspicious_alias">Alias Suspeito</SelectItem>
              <SelectItem value="excessive_numbers">Excesso de Números</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-lg">Nenhum registro suspeito encontrado.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customers?.full_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={reasonConfig[r.tag_reason]?.variant || 'outline'}>
                        {reasonConfig[r.tag_reason]?.label || r.tag_reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleClearTag(r.id)}>
                          <Eraser className="w-4 h-4 mr-1" />
                          Ignorar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleRemoveCustomer(
                              r.customer_id,
                              r.customers?.full_name || r.email || 'Cliente',
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
