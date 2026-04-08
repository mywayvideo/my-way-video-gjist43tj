import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState } from 'react'
import { Order } from '@/types/order'
import { orderService } from '@/services/orderService'
import { Link } from 'react-router-dom'

interface Props {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReorder: (id: string) => void
  onDownload: (order: Order) => void
  onCancel: () => void
}

export function OrderDetailsModal({
  orderId,
  open,
  onOpenChange,
  onReorder,
  onDownload,
  onCancel,
}: Props) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && orderId) {
      setLoading(true)
      orderService
        .fetchOrderDetails(orderId)
        .then((data) => {
          setOrder(data as Order)
        })
        .finally(() => setLoading(false))
    } else {
      setOrder(null)
    }
  }, [orderId, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[90vw] p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Detalhes do Pedido</DialogTitle>
          <DialogDescription>Pedido {order?.order_number}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          {loading || !order ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-secondary/20 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Data da compra</p>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Badge variant="outline" className="capitalize">
                    {order.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 border-b pb-2">Itens do Pedido</h4>
                <div className="space-y-3">
                  {order.order_items?.map((item) => {
                    const isDiscontinued = item.products?.is_discontinued === true
                    return (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          {isDiscontinued ? (
                            <p className="font-medium text-sm text-muted-foreground mb-0.5">
                              {item.products?.name || 'Produto'}{' '}
                              <span className="text-xs italic">(Produto descontinuado)</span>
                            </p>
                          ) : (
                            <Link
                              to={`/product/${item.product_id}`}
                              className="font-medium text-sm hover:underline hover:text-emerald-600 transition-colors block mb-0.5"
                            >
                              {item.products?.name || 'Produto'}
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}x $
                            {Number(item.unit_price).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <p className="font-bold">
                          $
                          {Number(item.total_price).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Pagamento</h4>
                  <p className="text-sm capitalize">{order.payment_method_type || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Envio</h4>
                  <p className="text-sm capitalize">{order.shipping_method || 'N/A'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-4 text-lg font-bold">
                <span>Total</span>
                <span>
                  $
                  {Number(order.total).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button variant="outline" className="min-h-11" onClick={() => onDownload(order)}>
                  Imprimir Pedido
                </Button>
                <Button className="min-h-11" onClick={() => onReorder(order.id)}>
                  Recomprar Itens
                </Button>
                {(order.status === 'pending' || order.status === 'pending_payment') && (
                  <Button variant="destructive" className="min-h-11" onClick={onCancel}>
                    Cancelar Pedido
                  </Button>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
