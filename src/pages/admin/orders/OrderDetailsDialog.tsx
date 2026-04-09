import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { adminOrdersService } from '@/services/adminOrdersService'
import { formatCurrency } from '@/utils/formatters'

export default function OrderDetailsDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [details, setDetails] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (open && orderId) {
      setLoading(true)
      adminOrdersService
        .getOrderDetails(orderId)
        .then((data) => {
          setDetails(data)
          setNotes(data.notes || '')
        })
        .catch(() => {
          toast({ title: 'Erro ao carregar detalhes', variant: 'destructive' })
        })
        .finally(() => setLoading(false))
    } else {
      setDetails(null)
    }
  }, [open, orderId, toast])

  const handleSaveNotes = async () => {
    if (!orderId) return
    try {
      await adminOrdersService.updateOrderNotes(orderId, notes)
      toast({ title: 'Notas salvas com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao salvar notas', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido</DialogTitle>
        </DialogHeader>
        {loading || !details ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-4 rounded-lg">
              <div>
                <h4 className="font-bold text-sm text-muted-foreground mb-2">CLIENTE</h4>
                <p className="font-medium">{details.customers?.full_name}</p>
                <p className="text-sm">{details.customers?.email}</p>
                <p className="text-sm">{details.customers?.phone || 'Sem telefone'}</p>
              </div>
              <div>
                <h4 className="font-bold text-sm text-muted-foreground mb-2">PEDIDO</h4>
                <p className="font-medium">{details.order_number}</p>
                <p className="text-sm">{new Date(details.created_at).toLocaleString()}</p>
                <p className="text-sm capitalize mt-1">
                  Status: <strong>{details.status}</strong>
                </p>
                <p className="text-sm capitalize">Método: {details.payment_method_type || 'N/A'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-muted-foreground mb-2">ENDEREÇOS</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="border p-3 rounded-md">
                  <strong>Entrega:</strong>
                  {details.shipping_address ? (
                    <p>
                      {details.shipping_address.street}, {details.shipping_address.number} -{' '}
                      {details.shipping_address.city}/{details.shipping_address.state}
                    </p>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
                <div className="border p-3 rounded-md">
                  <strong>Faturamento:</strong>
                  {details.billing_address ? (
                    <p>
                      {details.billing_address.street}, {details.billing_address.number} -{' '}
                      {details.billing_address.city}/{details.billing_address.state}
                    </p>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-muted-foreground mb-2">ITENS DO PEDIDO</h4>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.order_items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.products?.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price, 'USD')}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(item.total_price, 'USD')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="bg-muted p-3 text-right">
                  <span className="font-bold text-lg">
                    Total: {formatCurrency(details.total, 'USD')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-muted-foreground mb-2">NOTAS INTERNAS</h4>
              <Textarea
                placeholder="Adicione observações internas sobre este pedido..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end mt-2">
                <Button onClick={handleSaveNotes}>Salvar Notas</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
