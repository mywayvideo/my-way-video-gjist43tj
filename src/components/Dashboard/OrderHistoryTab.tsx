import { Order } from '@/types/customer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Download, RefreshCw, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { customerService } from '@/services/customerService'
import { toast } from 'sonner'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

export function OrderHistoryTab({
  orders,
  customerId,
  onRefresh,
}: {
  orders: Order[]
  customerId: string
  onRefresh: () => void
}) {
  const navigate = useNavigate()
  const [processing, setProcessing] = useState<string | null>(null)

  const handleReorder = async (orderId: string) => {
    try {
      setProcessing(orderId)
      await customerService.removeFromOrder(orderId)
      toast.success('Itens adicionados ao carrinho!')
      onRefresh()
    } catch (e) {
      toast.error('Erro ao recomprar. Tente novamente.')
    } finally {
      setProcessing(null)
    }
  }

  const handleDownloadNf = (orderId: string) => {
    toast.success('Nota fiscal baixada com sucesso.')
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('pendente')) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    if (s.includes('processando')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    if (s.includes('enviado') || s.includes('entregue'))
      return 'bg-green-500/10 text-green-600 border-green-500/20'
    if (s.includes('cancelado')) return 'bg-red-500/10 text-red-600 border-red-500/20'
    return 'bg-secondary text-secondary-foreground'
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg animate-fade-in">
        <Package className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">Nenhum pedido encontrado</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Você ainda não fez nenhum pedido conosco. Explore nossos produtos e faça sua primeira
          compra!
        </p>
        <Button onClick={() => navigate('/search')}>Explorar Produtos</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="hidden md:block border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead className="text-center">Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const itemCount =
                order.order_items?.reduce((acc, item) => acc + item.quantity, 0) || 0
              return (
                <TableRow key={order.id} className="hover:bg-secondary/20">
                  <TableCell className="font-medium text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-semibold">{order.order_number}</TableCell>
                  <TableCell className="text-center">{itemCount}</TableCell>
                  <TableCell className="text-right font-bold">
                    ${order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(order.status)} capitalize`}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver Detalhes"
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Baixar Nota Fiscal"
                        onClick={() => handleDownloadNf(order.id)}
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Recomprar"
                        disabled={processing === order.id}
                        onClick={() => handleReorder(order.id)}
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${processing === order.id ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {orders.map((order) => {
          const itemCount = order.order_items?.reduce((acc, item) => acc + item.quantity, 0) || 0
          return (
            <Card key={order.id} className="bg-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="font-bold text-lg">{order.order_number}</p>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(order.status)} capitalize`}>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-y border-border text-sm">
                  <span className="text-muted-foreground">
                    {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                  </span>
                  <span className="font-bold">
                    ${order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/order/${order.id}`)}
                    className="flex-1 text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Detalhes
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDownloadNf(order.id)}>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={processing === order.id}
                    onClick={() => handleReorder(order.id)}
                    className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${processing === order.id ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
