export const fetchUSDRate = async (): Promise<number> => {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL')
    const data = await res.json()
    return parseFloat(data.USDBRL.bid)
  } catch (error) {
    console.error('Failed to fetch USD rate:', error)
    throw error
  }
}
