import { supabase } from '@/lib/supabase/client'

const COMPANY_NAME = 'My Way Video'
const LOGO_URL = 'https://img.usecurling.com/i?q=video%20camera&color=blue&shape=fill'
const SUPPORT_EMAIL = 'support@mywayvideo.com'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const getBaseEmailTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #0f172a; padding: 24px; text-align: center; }
    .header img { max-height: 48px; }
    .content { padding: 32px; }
    .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 14px; color: #64748b; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px; }
    .order-details { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 24px; }
    .order-item { border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
    .order-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .item-title { font-weight: 600; margin-bottom: 4px; color: #0f172a; }
    .item-meta { font-size: 14px; color: #475569; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 18px; margin-top: 16px; padding-top: 16px; border-top: 2px solid #cbd5e1; color: #0f172a; }
    h1 { color: #0f172a; margin-top: 0; font-size: 24px; }
    h3 { color: #0f172a; margin-top: 0; font-size: 18px; }
    a { color: #2563eb; }
    @media only screen and (max-width: 600px) {
      .container { border-radius: 0; margin: 0; }
      .content { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="${COMPANY_NAME} Logo">
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. Todos os direitos reservados.</p>
      <p>Precisa de ajuda? Entre em contato com <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>
`

const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, htmlContent },
    })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Error sending email via edge function:', error)
    return { success: false, error: 'Erro ao enviar email. Tente novamente.' }
  }
}

export const sendNewOrderNotificationToAdmin = async (
  orderId: string,
  customerName: string,
  customerEmail: string,
  totalAmount: number,
  adminEmail: string = 'admin@mywayvideo.com',
) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number, status, created_at')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error('Pedido não encontrado')

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*, products(name)')
      .eq('order_id', orderId)

    if (itemsError) throw new Error('Erro ao buscar itens do pedido')

    let itemsHtml = ''
    if (orderItems && orderItems.length > 0) {
      itemsHtml = orderItems
        .map(
          (item: any) => `
        <div class="order-item">
          <div class="item-title">${item.products?.name || 'Produto indisponível'}</div>
          <div class="item-meta">Quantidade: ${item.quantity} | Preço un.: ${formatCurrency(item.unit_price)} | Subtotal: ${formatCurrency(item.total_price)}</div>
        </div>
      `,
        )
        .join('')
    }

    const orderDate = new Date(order.created_at || new Date()).toLocaleString('pt-BR')
    const orderNumber = order.order_number || `ORD-${orderId.substring(0, 6).toUpperCase()}`

    const content = `
      <h1>Novo Pedido Recebido</h1>
      <p>Olá Administrador,</p>
      <p>Um novo pedido foi recebido e está com status <strong>${order.status}</strong>.</p>
      
      <div class="order-details">
        <p><strong>Pedido:</strong> ${orderNumber}</p>
        <p><strong>Cliente:</strong> ${customerName} (<a href="mailto:${customerEmail}">${customerEmail}</a>)</p>
        <p><strong>Data/Hora:</strong> ${orderDate}</p>
        
        <h3 style="margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Itens do Pedido</h3>
        ${itemsHtml}
        
        <div class="total-row">
          <span>Total:</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
      </div>
      
      <p style="text-align: center; margin-top: 32px;">
        <a href="https://my-way-beta-ia.goskip.app/admin/orders" class="button">Ver Pedido no Painel</a>
      </p>
    `

    const htmlContent = getBaseEmailTemplate(`Novo Pedido Recebido - ${orderNumber}`, content)
    return await sendEmail(adminEmail, `Novo Pedido Recebido: ${orderNumber}`, htmlContent)
  } catch (error: any) {
    console.error('Error in sendNewOrderNotificationToAdmin:', error)
    return { success: false, error: 'Erro ao enviar notificação de novo pedido.' }
  }
}

export const sendOrderConfirmationToCustomer = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number, created_at, total')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error('Pedido não encontrado')

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*, products(name)')
      .eq('order_id', orderId)

    if (itemsError) throw new Error('Erro ao buscar itens do pedido')

    let itemsHtml = ''
    if (orderItems && orderItems.length > 0) {
      itemsHtml = orderItems
        .map(
          (item: any) => `
        <div class="order-item">
          <div class="item-title">${item.products?.name || 'Produto indisponível'}</div>
          <div class="item-meta">Quantidade: ${item.quantity} | Preço un.: ${formatCurrency(item.unit_price)} | Subtotal: ${formatCurrency(item.total_price)}</div>
        </div>
      `,
        )
        .join('')
    }

    const orderDate = new Date(order.created_at || new Date()).toLocaleString('pt-BR')
    const orderNumber = order.order_number || `ORD-${orderId.substring(0, 6).toUpperCase()}`

    const content = `
      <h1>Pedido Confirmado!</h1>
      <p>Olá ${customerName},</p>
      <p>Recebemos o pagamento do seu pedido e ele já está sendo processado pela nossa equipe. Agradecemos pela sua compra na ${COMPANY_NAME}!</p>
      
      <div class="order-details">
        <p><strong>Pedido:</strong> ${orderNumber}</p>
        <p><strong>Data da Compra:</strong> ${orderDate}</p>
        
        <h3 style="margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Resumo da Compra</h3>
        ${itemsHtml}
        
        <div class="total-row">
          <span>Total Pago:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>
      
      <p>O prazo estimado para entrega dependerá do método de envio escolhido. Você será notificado sobre as próximas etapas de entrega.</p>
      
      <p style="text-align: center; margin-top: 32px;">
        <a href="https://my-way-beta-ia.goskip.app/dashboard" class="button">Acompanhar Pedido</a>
      </p>
    `

    const htmlContent = getBaseEmailTemplate(
      `Pagamento Confirmado - Pedido ${orderNumber}`,
      content,
    )
    return await sendEmail(customerEmail, `Seu pedido ${orderNumber} foi confirmado!`, htmlContent)
  } catch (error: any) {
    console.error('Error in sendOrderConfirmationToCustomer:', error)
    return { success: false, error: 'Erro ao enviar confirmação de pedido.' }
  }
}

export const sendOrderRejectionToCustomer = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  rejectionReason?: string,
) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .maybeSingle()

    const orderNumber = order?.order_number || `ORD-${orderId.substring(0, 6).toUpperCase()}`
    const reasonHtml = rejectionReason
      ? `<p style="margin-bottom: 0;"><strong>Motivo do cancelamento:</strong> ${rejectionReason}</p>`
      : ''

    const content = `
      <h1 style="color: #dc2626;">Aviso sobre o seu Pedido</h1>
      <p>Olá ${customerName},</p>
      <p>Infelizmente, o seu pedido <strong>${orderNumber}</strong> foi cancelado em nosso sistema.</p>
      
      ${reasonHtml ? `<div class="order-details">${reasonHtml}</div>` : ''}
      
      <p>Se você acredita que isso foi um erro ou se houve algum problema no pagamento, nossa equipe de suporte está à disposição para ajudar a resolver a situação rapidamente.</p>
      
      <p style="text-align: center; margin-top: 32px;">
        <a href="mailto:${SUPPORT_EMAIL}" class="button" style="background-color: #64748b; margin-right: 8px;">Falar com Suporte</a>
        <a href="https://my-way-beta-ia.goskip.app/" class="button">Voltar à Loja</a>
      </p>
    `

    const htmlContent = getBaseEmailTemplate(
      `Atualização do Pedido ${orderNumber} - Cancelado`,
      content,
    )
    return await sendEmail(customerEmail, `Aviso sobre seu pedido ${orderNumber}`, htmlContent)
  } catch (error: any) {
    console.error('Error in sendOrderRejectionToCustomer:', error)
    return { success: false, error: 'Erro ao enviar aviso de cancelamento.' }
  }
}

export const sendRefundNotificationToCustomer = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  refundAmount: number,
  refundReason: string,
  bankAccountHolder: string,
  bankName: string,
) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .maybeSingle()

    const orderNumber = order?.order_number || `ORD-${orderId.substring(0, 6).toUpperCase()}`

    const content = `
      <h1>Confirmação de Reembolso</h1>
      <p>Olá ${customerName},</p>
      <p>Informamos que o reembolso referente ao pedido <strong>${orderNumber}</strong> foi processado com sucesso pela nossa equipe.</p>
      
      <div class="order-details">
        <p><strong>Valor do Reembolso:</strong> ${formatCurrency(refundAmount)}</p>
        <p><strong>Motivo:</strong> ${refundReason}</p>
        
        <h3 style="margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Dados Bancários Fornecidos</h3>
        <p><strong>Titular:</strong> ${bankAccountHolder}</p>
        <p><strong>Banco:</strong> ${bankName}</p>
      </div>
      
      <p>O valor deverá ser creditado na conta informada em até <strong>3 a 5 dias úteis</strong>, dependendo dos prazos de compensação da instituição bancária.</p>
      
      <p>Agradecemos a compreensão. Caso tenha dúvidas, estamos à disposição.</p>
      
      <p style="text-align: center; margin-top: 32px;">
        <a href="mailto:${SUPPORT_EMAIL}" class="button">Entrar em Contato</a>
      </p>
    `

    const htmlContent = getBaseEmailTemplate(
      `Confirmação de Reembolso - Pedido ${orderNumber}`,
      content,
    )
    return await sendEmail(
      customerEmail,
      `Seu reembolso do pedido ${orderNumber} foi processado`,
      htmlContent,
    )
  } catch (error: any) {
    console.error('Error in sendRefundNotificationToCustomer:', error)
    return { success: false, error: 'Erro ao enviar notificação de reembolso.' }
  }
}
