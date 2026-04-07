import { supabase } from '@/lib/supabase/client'

export const createPaymentIntent = async (
  amount: number,
  currency: string,
  customer_email: string,
  customer_name: string,
  order_id: string,
  metadata: any = {},
) => {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { amount, currency, customer_email, customer_name, order_id, metadata },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}

export const confirmCardPayment = async (
  stripe: any,
  clientSecret: string,
  cardElement: any,
  name: string,
  email: string,
) => {
  const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        name,
        email,
      },
    },
  })

  if (result.error) {
    throw new Error(result.error.message || 'Cartão inválido')
  }

  return result.paymentIntent
}

export const createOrderAfterPayment = async (
  paymentIntentId: string,
  orderTotal: number,
  items: any[],
  userEmail: string,
  userId: string,
  shippingAddressId: string | null,
  shippingMethod: string | null,
  freight: number | null,
  discountAmount: number | null,
) => {
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!customer) throw new Error('Cliente não encontrado')

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      order_number: orderNumber,
      status: 'paid',
      shipping_address_id: shippingAddressId,
      payment_method_type: 'card',
      subtotal: orderTotal - (freight || 0) + (discountAmount || 0),
      discount_amount: discountAmount,
      shipping_cost: freight,
      total: orderTotal,
      shipping_method: shippingMethod,
    })
    .select('id')
    .single()

  if (orderErr) throw orderErr

  const itemsToInsert = items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert)
  if (itemsErr) throw itemsErr

  const { error: historyErr } = await supabase.from('order_status_history').insert({
    order_id: order.id,
    new_status: 'paid',
  })
  if (historyErr) throw historyErr

  return order.id
}

export const clearCartFromLocalStorage = () => {
  localStorage.removeItem('cart')
  localStorage.removeItem('shopping-cart')
  localStorage.removeItem('cartItems')
  localStorage.removeItem('cart-storage')
}

export const clearCartFromSupabase = async (userId: string) => {
  await supabase.from('cart_items').delete().eq('user_id', userId)

  const { data: cust } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (cust) {
    const { data: cart } = await supabase
      .from('shopping_carts')
      .select('id')
      .eq('customer_id', cust.id)
      .maybeSingle()
    if (cart) {
      await supabase.from('cart_items').delete().eq('cart_id', cart.id)
    }
  }
}
