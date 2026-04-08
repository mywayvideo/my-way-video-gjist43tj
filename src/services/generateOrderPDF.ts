import jsPDF from 'jspdf'

export const generateOrderPDF = async (orderData: any): Promise<jsPDF | null> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    try {
      const logoUrl = '/logo.png'
      const img = new Image()
      img.src = logoUrl
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      doc.addImage(img, 'PNG', 15, 15, 40, 15)
    } catch (e) {
      // Ignore logo error
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text('My Way Video', 195, 15, { align: 'right' })
    doc.text('Miami, FL 33122', 195, 20, { align: 'right' })
    doc.text('contato@mywayvideo.com', 195, 25, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(50, 50, 50)
    doc.text('PEDIDO DE COMPRA', 105, 45, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalhes do Pedido:', 15, 60)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Número do Pedido: ${orderData.orderNumber || orderData.order_number}`, 15, 67)

    const orderDate =
      orderData.createdAt || orderData.created_at
        ? new Date(orderData.createdAt || orderData.created_at).toLocaleDateString('pt-BR')
        : 'N/A'
    doc.text(`Data: ${orderDate}`, 15, 73)

    const custName = orderData.customerName || orderData.customers?.full_name || 'N/A'
    const custEmail = orderData.customerEmail || orderData.customers?.email || 'N/A'

    doc.text(`Cliente: ${custName}`, 15, 79)
    doc.text(`Email: ${custEmail}`, 15, 85)

    doc.text(
      `Método de Entrega: ${orderData.deliveryMethod || orderData.shipping_method || 'N/A'}`,
      15,
      91,
    )
    doc.text(
      `Método de Pagamento: ${orderData.paymentMethod || orderData.payment_method_type || 'N/A'}`,
      15,
      97,
    )

    const isBrl =
      orderData.paymentMethod === 'transferencia_brasil' ||
      orderData.paymentMethod === 'pix' ||
      orderData.payment_method_type === 'transferencia_brasil' ||
      orderData.payment_method_type === 'pix'
    const currencySym = isBrl ? 'R$' : 'US$'

    let yPos = 110
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    doc.text('Item', 17, yPos)
    doc.text('Qtd', 120, yPos)
    doc.text('Preço Unit.', 140, yPos)
    doc.text('Total', 170, yPos)

    yPos += 8
    doc.setFont('helvetica', 'normal')

    const items = orderData.items || orderData.order_items || []
    items.forEach((item: any) => {
      const name = item.name || item.products?.name || 'Produto'
      const qty = item.quantity || item.qtd || 1
      const unitPrice = item.unitPrice || item.unit_price || 0
      const total = item.total || item.total_price || qty * unitPrice

      const shortName = name.length > 50 ? name.substring(0, 47) + '...' : name

      doc.text(shortName, 17, yPos)
      doc.text(qty.toString(), 120, yPos)
      doc.text(`${currencySym} ${unitPrice.toFixed(2)}`, 140, yPos)
      doc.text(`${currencySym} ${total.toFixed(2)}`, 170, yPos)
      yPos += 7
    })

    yPos += 5
    doc.line(15, yPos, 195, yPos)
    yPos += 8

    const subtotal = orderData.subtotal || 0
    const shipping = orderData.shipping || orderData.shipping_cost || 0
    const tax = orderData.tax || orderData.tax_amount || 0
    const discount = orderData.discount_amount || 0
    const total = orderData.total || 0

    doc.text(`Subtotal:`, 140, yPos)
    doc.text(`${currencySym} ${subtotal.toFixed(2)}`, 170, yPos)
    yPos += 7

    if (discount > 0) {
      doc.text(`Desconto:`, 140, yPos)
      doc.text(`-${currencySym} ${discount.toFixed(2)}`, 170, yPos)
      yPos += 7
    }

    doc.text(`Frete:`, 140, yPos)
    doc.text(`${currencySym} ${shipping.toFixed(2)}`, 170, yPos)
    yPos += 7

    if (tax > 0) {
      doc.text(`Impostos:`, 140, yPos)
      doc.text(`${currencySym} ${tax.toFixed(2)}`, 170, yPos)
      yPos += 7
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(16, 185, 129)
    doc.text(`Total:`, 140, yPos)
    doc.text(`${currencySym} ${total.toFixed(2)}`, 170, yPos)

    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, pageHeight - 10)
    doc.text(`Página 1 de 1`, 195, pageHeight - 10, { align: 'right' })

    return doc
  } catch (error) {
    console.error('Error generating PDF:', error)
    return null
  }
}
