'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getTema, type Tema } from '@/lib/temas'
import { createClient } from '@/lib/supabase/client'

interface TemaContextType {
  tema: Tema
  setTemaId: (id: string) => void
}

const TemaContext = createContext<TemaContextType>({
  tema: getTema('bosque'),
  setTemaId: () => {},
})

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [temaId, setTemaIdState] = useState('bosque')

  useEffect(() => {
    async function cargarTema() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: tiendaOwner } = await supabase
        .from('tiendas')
        .select('tema')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (tiendaOwner?.tema) {
        setTemaIdState(tiendaOwner.tema)
        return
      }

      const { data: membresia } = await supabase
        .from('miembros')
        .select('tienda_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membresia?.tienda_id) return

      const { data: tiendaMiembro } = await supabase
        .from('tiendas')
        .select('tema')
        .eq('id', membresia.tienda_id)
        .maybeSingle()

      if (tiendaMiembro?.tema) setTemaIdState(tiendaMiembro.tema)
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

  function setTemaId(id: string) {
    setTemaIdState(id)
  }

  return <TemaContext.Provider value={{ tema: getTema(temaId), setTemaId }}>{children}</TemaContext.Provider>
}

export function useTema() {
  return useContext(TemaContext)
}
