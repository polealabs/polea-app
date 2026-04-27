'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getTema, TEMAS, type TamanoLetra, type Tema } from '@/lib/temas'
import { createClient } from '@/lib/supabase/client'

interface TemaContextType {
  tema: Tema
  setTemaId: (id: string) => void
  tamano: TamanoLetra
  setTamano: (t: TamanoLetra) => void
}

const TemaContext = createContext<TemaContextType>({
  tema: getTema('bosque'),
  setTemaId: () => {},
  tamano: 'normal',
  setTamano: () => {},
})

const TAMANOS: TamanoLetra[] = ['normal', 'grande']

function leerTemaIdInicial(): string {
  if (typeof window === 'undefined') return 'bosque'
  const raw = localStorage.getItem('polea_tema')
  if (raw && TEMAS.some((t) => t.id === raw)) return raw
  return 'bosque'
}

function leerTamanoInicial(): TamanoLetra {
  if (typeof window === 'undefined') return 'normal'
  const raw = localStorage.getItem('polea_tamano')
  if (raw && TAMANOS.includes(raw as TamanoLetra)) return raw as TamanoLetra
  return 'normal'
}

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [temaId, setTemaIdState] = useState<string>(() => leerTemaIdInicial())
  const [tamano, setTamanoState] = useState<TamanoLetra>(() => leerTamanoInicial())

  useEffect(() => {
    async function cargarTema() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: tiendaOwner } = await supabase
        .from('tiendas')
        .select('tema, tamano_letra')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (tiendaOwner?.tema) {
        setTemaIdState(tiendaOwner.tema)
        localStorage.setItem('polea_tema', tiendaOwner.tema)
      }
      if (tiendaOwner?.tamano_letra) {
        const tl = tiendaOwner.tamano_letra as TamanoLetra
        setTamanoState(tl)
        localStorage.setItem('polea_tamano', tl)
      }
      if (tiendaOwner) return

      const { data: membresia } = await supabase
        .from('miembros')
        .select('tienda_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membresia?.tienda_id) return

      const { data: tiendaMiembro } = await supabase
        .from('tiendas')
        .select('tema, tamano_letra')
        .eq('id', membresia.tienda_id)
        .maybeSingle()

      if (tiendaMiembro?.tema) {
        setTemaIdState(tiendaMiembro.tema)
        localStorage.setItem('polea_tema', tiendaMiembro.tema)
      }
      if (tiendaMiembro?.tamano_letra) {
        const tl = tiendaMiembro.tamano_letra as TamanoLetra
        setTamanoState(tl)
        localStorage.setItem('polea_tamano', tl)
      }
    }
    void cargarTema()
  }, [])

  useEffect(() => {
    const t = getTema(temaId)
    const root = document.documentElement
    root.style.setProperty('--color-primary', t.colores.primary)
    root.style.setProperty('--color-primary-light', t.colores.primaryLight)
    root.style.setProperty('--color-accent', t.colores.accent)
    root.style.setProperty('--color-accent-hover', t.colores.accentHover)
    root.style.setProperty('--color-accent-pale', t.colores.accentPale)
    root.style.setProperty('--color-background', t.colores.background)
    root.style.setProperty('--color-surface', t.colores.surface)
    root.style.setProperty('--color-border', t.colores.border)
    root.style.setProperty('--color-text', t.colores.text)
    root.style.setProperty('--color-text-soft', t.colores.textSoft)
    root.style.setProperty('--color-text-faint', t.colores.textFaint)
  }, [temaId])

  useEffect(() => {
    const sizes: Record<string, string> = {
      normal: '15px',
      grande: '18px',
    }
    document.documentElement.style.fontSize = sizes[tamano] ?? '15px'
  }, [tamano])

  function setTemaId(id: string) {
    setTemaIdState(id)
    localStorage.setItem('polea_tema', id)
  }

  function setTamano(t: TamanoLetra) {
    setTamanoState(t)
    localStorage.setItem('polea_tamano', t)
  }

  return <TemaContext.Provider value={{ tema: getTema(temaId), setTemaId, tamano, setTamano }}>{children}</TemaContext.Provider>
}

export function useTema() {
  return useContext(TemaContext)
}

export function useTamano() {
  const { tamano, setTamano } = useContext(TemaContext)
  return { tamano, setTamano }
}
