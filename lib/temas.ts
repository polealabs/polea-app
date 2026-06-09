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
    descripcion: 'El tema original de Leva',
    colores: {
      primary: '#1E3A2F',
      primaryLight: '#2D4A3E',
      accent: '#4A90D9',
      accentHover: '#5C9FE0',
      accentPale: '#E8F2FB',
      background: '#F4F1EA',
      surface: '#FFFFFF',
      border: '#DCD7CA',
      text: '#16140F',
      textSoft: '#4A463C',
      textFaint: '#6E6860',
    },
  },
  {
    id: 'oceano',
    nombre: 'Océano',
    descripcion: 'Azul profundo y turquesa',
    colores: {
      primary: '#0F2D4A',
      primaryLight: '#1A3D5C',
      accent: '#4A90D9',
      accentHover: '#5C9FE0',
      accentPale: '#E8F2FB',
      background: '#EFF4F9',
      surface: '#FFFFFF',
      border: '#C4D8EA',
      text: '#0C1A2E',
      textSoft: '#3A5A78',
      textFaint: '#6A90A8',
    },
  },
  {
    id: 'rosa',
    nombre: 'Rosa',
    descripcion: 'Suave y elegante',
    colores: {
      primary: '#6B2D4A',
      primaryLight: '#842D5A',
      accent: '#4A90D9',
      accentHover: '#5C9FE0',
      accentPale: '#E8F2FB',
      background: '#F8F3F6',
      surface: '#FFFFFF',
      border: '#E4D0DC',
      text: '#2A1020',
      textSoft: '#7A4A68',
      textFaint: '#A87898',
    },
  },
  {
    id: 'tierra',
    nombre: 'Tierra',
    descripcion: 'Cálido y natural',
    colores: {
      primary: '#3D1F0A',
      primaryLight: '#5C2E0E',
      accent: '#4A90D9',
      accentHover: '#5C9FE0',
      accentPale: '#E8F2FB',
      background: '#F7F3EC',
      surface: '#FFFFFF',
      border: '#DDD5C4',
      text: '#1C0E00',
      textSoft: '#5A4030',
      textFaint: '#8A7060',
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
