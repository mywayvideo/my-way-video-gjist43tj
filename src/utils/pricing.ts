export const calculateFinalPrice = (p: any): number => {
  if (!p) return 0

  let finalUsdPrice = Number(p.price_usd) || Number(p.price_usa) || 0
  const rebate = Number(p.price_usa_rebate) || 0

  if (rebate > 0) {
    if (!p.date_rebate) {
      finalUsdPrice = rebate
    } else {
      const currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)
      const rebateDate = new Date(p.date_rebate)
      rebateDate.setHours(0, 0, 0, 0)

      if (currentDate <= rebateDate) {
        finalUsdPrice = rebate
      }
    }
  }

  return finalUsdPrice
}
