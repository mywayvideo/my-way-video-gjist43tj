import { useState } from 'react'
import { toast } from 'sonner'
import { orderService } from '@/services/orderService'
import { useNavigate } from 'react-router-dom'
import { Order } from '@/types/order'

export function useOrderActions() {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleDownloadInvoice = async (order: Order) => {
    try {
      setActionLoading(`invoice-${order.id}`)
      const blob = await orderService.generateInvoicePDF(order, '/logo.png')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${order.order_number}.pdf`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Nota fiscal baixada com sucesso.')
    } catch (e) {
      toast.error('Erro ao gerar nota fiscal. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReorder = async (orderId: string) => {
    try {
      setActionLoading(`reorder-${orderId}`)
      await orderService.copyOrderToCart(orderId)
      toast.success('Itens adicionados ao carrinho! Revise e confirme.')
      setTimeout(() => navigate('/checkout'), 2000)
    } catch (e) {
      toast.error('Nao foi possivel copiar itens. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelOrder = async (
    orderId: string,
    reason: string,
    paymentMethod: string,
    onSuccess?: () => void,
  ) => {
    try {
      setActionLoading(`cancel-${orderId}`)
      await orderService.cancelOrderWithRefund(orderId, reason, paymentMethod)
      if (paymentMethod === 'card') {
        toast.success('Pedido cancelado com sucesso!')
      } else {
        toast.success('Cancelamento solicitado. Admin processara a devolucao.')
      }
      onSuccess?.()
    } catch (e) {
      toast.error('Nao foi possivel cancelar. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  return {
    actionLoading,
    handleDownloadInvoice,
    handleReorder,
    handleCancelOrder,
  }
}
