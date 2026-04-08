import { supabase } from '@/lib/supabase/client'
import { Order } from '@/types/order'

export const orderService = {
  fetchOrderDetails: async (orderId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(*), order_items(*, products(*))')
      .eq('id', orderId)
      .single()
    if (error) throw error
    return data
  },

  generateInvoicePDF: async (order: Order, logoUrl: string) => {
    const custName =
      (order as any).customers?.full_name || (order as any).customer?.full_name || order.customer_id
    const custEmail = (order as any).customers?.email || (order as any).customer?.email || 'N/A'
    let content = `My Way Video Professional Audiovisual Shop\nPedido: ${order.order_number}\nData: ${new Date(order.created_at).toLocaleDateString('pt-BR')}\nCliente: ${custName}\nEmail: ${custEmail}\n\nItens:\n`

    order.order_items?.forEach((item) => {
      content += `- ${item.products?.name || 'Produto'} (${item.quantity}x) - $${Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    })

    content += `\nSubtotal: $${Number(order.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nFrete: $${Number(order.shipping_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nDesconto: $${Number(order.discount_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nTotal: $${Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`

    if (order.payment_method_type === 'transfer') {
      content += `DADOS BANCÁRIOS PARA DEPÓSITO:\nBanco: Miami International Bank\nConta: 987654321\nRouting: 123456789\nTitular: My Way Video Shop\nSWIFT: MWVUS33\n\nFavor transferir para a conta acima. Pedido será processado após confirmação.\n\n`
    }

    content += `Obrigado pela sua compra!`
    return new Blob([content], { type: 'application/pdf' })
  },

  copyOrderToCart: async (orderId: string) => {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id
    if (!userId) throw new Error('Not authenticated')

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!customer) throw new Error('Customer not found')

    const { data: items, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
    if (error) throw error

    let { data: cart } = await supabase
      .from('shopping_carts')
      .select('id')
      .eq('customer_id', customer.id)
      .single()

    if (!cart) {
      const { data: newCart, error: cartErr } = await supabase
        .from('shopping_carts')
        .insert({ customer_id: customer.id })
        .select()
        .single()
      if (cartErr) throw cartErr
      cart = newCart
    }

    if (items && items.length > 0) {
      const cartItemsData = items.map((item) => ({
        cart_id: cart.id,
        product_id: item.product_id,
        quantity: item.quantity,
        user_id: userId,
      }))
      await supabase.from('cart_items').insert(cartItemsData)

      const localCart = JSON.parse(localStorage.getItem('cart-items') || '[]')
      items.forEach((item) => {
        localCart.push({ product_id: item.product_id, quantity: item.quantity })
      })
      localStorage.setItem('cart-items', JSON.stringify(localCart))
    }
  },

  cancelOrderWithRefund: async (orderId: string, reason: string, paymentMethod: string) => {
    if (paymentMethod === 'card') {
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
      const paymentIntentId = order?.payment_data?.payment_intent_id
      if (paymentIntentId) {
        await supabase.functions.invoke('cancel-stripe-charge', { body: { paymentIntentId } })
      }
    } else {
      await supabase.functions.invoke('notify-admin-refund', { body: { orderId, reason } })
    }

    const { data: items } = await supabase.from('order_items').select('id').eq('order_id', orderId)

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
    if (error) throw error

    if (items && items.length > 0) {
      await supabase.from('order_returns').insert(
        items.map((item) => ({
          order_id: orderId,
          order_item_id: item.id,
          reason,
          status: paymentMethod === 'card' ? 'completed' : 'pending',
        })),
      )
    }

    await supabase.from('order_status_history').insert({
      order_id: orderId,
      old_status: 'pending',
      new_status: 'cancelled',
    })
  },
}
