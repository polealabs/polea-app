export interface MargenIndustria {
  industria: string
  margenMinimo: number
  margenRecomendado: number
  margenPremium: number
  descripcion: string
}

export const MARGENES_INDUSTRIA: MargenIndustria[] = [
  {
    industria: 'Joyería y accesorios',
    margenMinimo: 50,
    margenRecomendado: 65,
    margenPremium: 80,
    descripcion: 'Alta percepción de valor. El cliente paga por exclusividad y acabado.',
  },
  {
    industria: 'Ropa y calzado',
    margenMinimo: 40,
    margenRecomendado: 55,
    margenPremium: 70,
    descripcion: 'Varía según posicionamiento. Marcas propias tienen más margen que reventa.',
  },
  {
    industria: 'Restaurante y alimentos',
    margenMinimo: 25,
    margenRecomendado: 35,
    margenPremium: 50,
    descripcion: 'Márgenes más ajustados por perecederos. El volumen es clave.',
  },
  {
    industria: 'Cosméticos y spa',
    margenMinimo: 50,
    margenRecomendado: 62,
    margenPremium: 75,
    descripcion: 'El cliente paga por confianza y experiencia. Fidelización alta.',
  },
  {
    industria: 'Ferretería y herramientas',
    margenMinimo: 20,
    margenRecomendado: 30,
    margenPremium: 45,
    descripcion: 'Márgenes moderados. El volumen y la disponibilidad son el diferenciador.',
  },
  {
    industria: 'Artesanías y manualidades',
    margenMinimo: 50,
    margenRecomendado: 67,
    margenPremium: 80,
    descripcion: 'El valor artesanal justifica márgenes altos. No compitas por precio.',
  },
  {
    industria: 'Suplementos y salud',
    margenMinimo: 40,
    margenRecomendado: 55,
    margenPremium: 70,
    descripcion: 'Alta percepción de valor en salud. La marca y los ingredientes importan.',
  },
  {
    industria: 'Floristería',
    margenMinimo: 40,
    margenRecomendado: 55,
    margenPremium: 65,
    descripcion: 'Producto perecedero. Margen alto para compensar mermas inevitables.',
  },
  {
    industria: 'Papelería y regalos',
    margenMinimo: 35,
    margenRecomendado: 50,
    margenPremium: 65,
    descripcion: 'Amplio rango según exclusividad. El packaging suma mucho valor.',
  },
  {
    industria: 'Otro',
    margenMinimo: 30,
    margenRecomendado: 50,
    margenPremium: 65,
    descripcion: 'Rango general recomendado para la mayoría de negocios.',
  },
]

export function getMargenPorIndustria(categoria: string): MargenIndustria {
  if (!categoria) return MARGENES_INDUSTRIA[MARGENES_INDUSTRIA.length - 1]
  return (
    MARGENES_INDUSTRIA.find((m) =>
      categoria.toLowerCase().includes(m.industria.toLowerCase().split(' ')[0].toLowerCase()),
    ) ?? MARGENES_INDUSTRIA[MARGENES_INDUSTRIA.length - 1]
  )
}
