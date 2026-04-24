'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getTema, type TamanoLetra, type Tema } from '@/lib/temas'
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

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [temaId, setTemaIdState] = useState('bosque')
  const [tamano, setTamanoState] = useState<TamanoLetra>('normal')

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
      }
      if (tiendaOwner?.tamano_letra) setTamanoState(tiendaOwner.tamano_letra as TamanoLetra)
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

      if (tiendaMiembro?.tema) setTemaIdState(tiendaMiembro.tema)
      if (tiendaMiembro?.tamano_letra) setTamanoState(tiendaMiembro.tamano_letra as TamanoLetra)
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
  }

  function setTamano(t: TamanoLetra) {
    setTamanoState(t)
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
