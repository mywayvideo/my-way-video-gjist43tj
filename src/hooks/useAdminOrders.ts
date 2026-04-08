import { useState, useCallback } from 'react'
import { adminOrdersService, GetOrdersFilters } from '@/services/adminOrdersService'
import { AdminOrder } from '@/types/admin-order'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export const useAdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<GetOrdersFilters>({ page: 1, limit: 10 })
  const { toast } = useToast()

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { orders, count } = await adminOrdersService.getOrders(filters)
      setOrders(orders)
      setTotalCount(count || 0)
    } catch (err: any) {
      setError(err.message)
      toast({ title: 'Erro de conexão. Tente novamente.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  const approveOrder = async (orderId: string, customerEmail: string, orderNumber: string) => {
    try {
      await adminOrdersService.updateOrderStatus(orderId, 'paid')
      toast({ title: 'Pedido aprovado com sucesso!' })
      await supabase.functions.invoke('send-order-email', {
        body: {
          to: customerEmail,
          subject: 'Pedido Aprovado',
          text: `Seu pagamento foi confirmado. Pedido: ${orderNumber}`,
        },
      })
      fetchOrders()
    } catch (err) {
      toast({ title: 'Erro ao aprovar pedido.', variant: 'destructive' })
      throw err
    }
  }

  const rejectOrder = async (orderId: string, customerEmail: string, orderNumber: string) => {
    try {
      await adminOrdersService.rejectOrder(orderId)
      toast({ title: 'Pedido rejeitado' })
      await supabase.functions.invoke('send-order-email', {
        body: {
          to: customerEmail,
          subject: 'Pedido Rejeitado',
          text: `Seu pedido ${orderNumber} foi rejeitado. Entre em contato conosco.`,
        },
      })
      fetchOrders()
    } catch (err) {
      toast({ title: 'Erro ao rejeitar pedido.', variant: 'destructive' })
      throw err
    }
  }

  const processRefund = async (
    orderId: string,
    refundData: any,
    customerEmail: string,
    orderNumber: string,
  ) => {
    try {
      await adminOrdersService.processRefund(orderId, refundData)
      toast({ title: 'Devolução processada com sucesso!' })
      await supabase.functions.invoke('send-order-email', {
        body: {
          to: customerEmail,
          subject: 'Devolução Processada',
          text: `Devolução do pedido ${orderNumber} no valor de ${refundData.amount} foi processada para a conta informada.`,
        },
      })
      fetchOrders()
    } catch (err) {
      toast({ title: 'Erro ao processar devolução.', variant: 'destructive' })
      throw err
    }
  }

  return {
    orders,
    loading,
    error,
    totalCount,
    filters,
    setFilters,
    fetchOrders,
    approveOrder,
    rejectOrder,
    processRefund,
  }
}
