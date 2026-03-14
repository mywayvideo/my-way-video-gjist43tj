export type Product = {
  id: string
  name: string
  brand: string
  category: string
  priceMiami: number
  priceBrazil: number
  image: string
  inStock: boolean
  stockQuantity: number
  deliveryModes: string
  description: string
  specs: Record<string, string>
}

export const CATEGORIES = [
  {
    id: 'cam',
    name: 'Câmeras',
    image: 'https://img.usecurling.com/p/400/300?q=cinema%20camera&color=black',
  },
  {
    id: 'lens',
    name: 'Lentes',
    image: 'https://img.usecurling.com/p/400/300?q=camera%20lens&color=black',
  },
  {
    id: 'light',
    name: 'Iluminação',
    image: 'https://img.usecurling.com/p/400/300?q=studio%20lighting',
  },
  {
    id: 'audio',
    name: 'Áudio',
    image: 'https://img.usecurling.com/p/400/300?q=professional%20microphone',
  },
]

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Sony FX3 Cinema Line',
    brand: 'Sony',
    category: 'Câmeras',
    priceMiami: 3898.0,
    priceBrazil: 4500.0,
    image: 'https://img.usecurling.com/p/600/600?q=sony%20camera',
    inStock: true,
    stockQuantity: 15,
    deliveryModes: 'Expressa 1 dia, Normal 3 dias, Retirada SP',
    description:
      'Câmera de cinema compacta com sensor Full Frame, ideal para produções ágeis e gimbals.',
    specs: {
      Sensor: 'Full-Frame CMOS',
      Resolução: '4K 120p',
      Montagem: 'E-Mount',
      ISO: '80-102400',
    },
  },
  {
    id: 'p2',
    name: 'ARRI Alexa Mini LF',
    brand: 'ARRI',
    category: 'Câmeras',
    priceMiami: 65000.0,
    priceBrazil: 75000.0,
    image: 'https://img.usecurling.com/p/600/600?q=arri%20alexa',
    inStock: false,
    stockQuantity: 0,
    deliveryModes: 'Sob Encomenda (30-60 dias)',
    description:
      'A escolha padrão de Hollywood. Sensor Large Format para um look cinematográfico imersivo.',
    specs: {
      Sensor: 'Large Format ARRI ALEV III',
      Resolução: '4.5K',
      Montagem: 'LPL',
      Peso: '2.6 kg',
    },
  },
  {
    id: 'p3',
    name: 'Zeiss CP.3 35mm T2.1',
    brand: 'Zeiss',
    category: 'Lentes',
    priceMiami: 4390.0,
    priceBrazil: 5100.0,
    image: 'https://img.usecurling.com/p/600/600?q=zeiss%20lens',
    inStock: true,
    stockQuantity: 8,
    deliveryModes: 'Expressa 2 dias, Normal 5 dias',
    description: 'Lente prime compacta com excelente nitidez e reprodução de cores.',
    specs: { Distância: '35mm', Abertura: 'T2.1', Montagem: 'PL', Diâmetro: '95mm' },
  },
  {
    id: 'p4',
    name: 'Aputure LS 600d Pro',
    brand: 'Aputure',
    category: 'Iluminação',
    priceMiami: 1890.0,
    priceBrazil: 2300.0,
    image: 'https://img.usecurling.com/p/600/600?q=studio%20light',
    inStock: true,
    stockQuantity: 22,
    deliveryModes: 'Expressa 1 dia, Transportadora 4 dias',
    description: 'Iluminador LED Daylight de alta potência, resistente a intempéries.',
    specs: { Potência: '600W', Temperatura: '5600K', CRI: '96+', Montagem: 'Bowens' },
  },
  {
    id: 'p5',
    name: 'Sennheiser MKH 416',
    brand: 'Sennheiser',
    category: 'Áudio',
    priceMiami: 999.0,
    priceBrazil: 1200.0,
    image: 'https://img.usecurling.com/p/600/600?q=shotgun%20microphone',
    inStock: true,
    stockQuantity: 40,
    deliveryModes: 'Correios Sedex, Loggi, Retirada',
    description: 'Microfone shotgun padrão da indústria para captação direcional em set.',
    specs: {
      Tipo: 'Shotgun Condensador',
      Padrão: 'Supercardióide/Lobular',
      Resposta: '40 Hz - 20 kHz',
    },
  },
]
