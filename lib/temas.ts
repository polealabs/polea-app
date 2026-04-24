export interface Tema {
  id: string
  nombre: string
  descripcion: string
  colores: {
    primary: string
    primaryLight: string
    accent: string
    accentHover: string
    accentPale: string
    background: string
    surface: string
    border: string
    text: string
    textSoft: string
    textFaint: string
  }
}

export const TEMAS: Tema[] = [
  {
    id: 'bosque',
    nombre: 'Bosque',
    descripcion: 'El tema original de Polea',
    colores: {
      primary: '#1E3A2F',
      primaryLight: '#2D4A3E',
      accent: '#C4622D',
      accentHover: '#E8845A',
      accentPale: '#F9EDE5',
      background: '#FAF6F0',
      surface: '#FFFFFF',
      border: '#EDE5DC',
      text: '#1A1510',
      textSoft: '#8A7D72',
      textFaint: '#A09080',
    },
  },
  {
    id: 'oceano',
    nombre: 'Océano',
    descripcion: 'Azul profundo y turquesa',
    colores: {
      primary: '#0F2D4A',
      primaryLight: '#1A3D5C',
      accent: '#0891B2',
      accentHover: '#22D3EE',
      accentPale: '#E0F7FA',
      background: '#F0F8FF',
      surface: '#FFFFFF',
      border: '#BAE6FD',
      text: '#0C1A2E',
      textSoft: '#64748B',
      textFaint: '#7EB8D0',
    },
  },
  {
    id: 'rosa',
    nombre: 'Rosa',
    descripcion: 'Suave y elegante',
    colores: {
      primary: '#6B2D4A',
      primaryLight: '#842D5A',
      accent: '#DB2777',
      accentHover: '#EC4899',
      accentPale: '#FDF2F8',
      background: '#FFF5F7',
      surface: '#FFFFFF',
      border: '#FBCFE8',
      text: '#3B0764',
      textSoft: '#9D4F7A',
      textFaint: '#D4799A',
    },
  },
  {
    id: 'tierra',
    nombre: 'Tierra',
    descripcion: 'Cálido y natural',
    colores: {
      primary: '#3D1F0A',
      primaryLight: '#5C2E0E',
      accent: '#C2410C',
      accentHover: '#EA580C',
      accentPale: '#FFF7ED',
      background: '#FEFCE8',
      surface: '#FFFFFF',
      border: '#FDE68A',
      text: '#1C0A00',
      textSoft: '#78350F',
      textFaint: '#C4924A',
    },
  },
]

export function getTema(id: string): Tema {
  return TEMAS.find((t) => t.id === id) ?? TEMAS[0]
}

export type TamanoLetra = 'normal' | 'grande'

export const TAMANOS_LETRA: { id: TamanoLetra; nombre: string; descripcion: string; valor: string }[] = [
  { id: 'normal', nombre: 'Normal', descripcion: 'Tamaño estándar', valor: '15px' },
  { id: 'grande', nombre: 'Grande', descripcion: 'Para mejor legibilidad', valor: '18px' },
]
