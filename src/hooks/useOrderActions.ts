import { useState } from 'react'
import { toast } from 'sonner'
import { orderService } from '@/services/orderService'
import { useNavigate } from 'react-router-dom'
import { Order } from '@/types/order'
import { generateOrderPDF } from '@/services/generateOrderPDF'
import { useCart } from '@/hooks/useCart'
import { supabase } from '@/lib/supabase/client'

export function useOrderActions() {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const navigate = useNavigate()
  const { addItem } = useCart()

  const handleDownloadInvoice = async (order: Order) => {
    try {
      setActionLoading(`invoice-${order.id}`)
      const doc = await generateOrderPDF(order)
      if (doc) {
        doc.save(`pedido-${order.order_number || order.id}.pdf`)
        toast.success('Pedido impresso com sucesso!')
      } else {
        toast.error('Nao foi possivel gerar o PDF. Tente novamente.')
      }
    } catch (e) {
      toast.error('Nao foi possivel gerar o PDF. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReorder = async (orderId: string) => {
    try {
      setActionLoading(`reorder-${orderId}`)

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('order_id', orderId)

      if (error) throw error

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (item.products) {
            addItem(item.products, item.quantity)
          }
        }
      } else {
        await orderService.copyOrderToCart(orderId)
      }

      toast.success('Itens adicionados ao carrinho! Revise e confirme.')
      navigate('/cart')
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
