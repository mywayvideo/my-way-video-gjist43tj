export function formatPrice(price?: number | null): string {
  if (price === null || price === undefined || price < 0.01) {
    return 'PREÇO SOB CONSULTA'
  }
  return (
    'US$ ' +
    price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export function formatPriceBRL(price?: number | null): string {
  if (price === null || price === undefined || price < 0.01) {
    return 'PREÇO SOB CONSULTA'
  }
  return (
    'R$ ' +
    price.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
