'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tienda, Rol } from '@/lib/types'

interface UseTiendaResult {
  tienda: Tienda | null
  loading: boolean
  rol: Rol | null
  isOwner: boolean
  isAdmin: boolean
  isVendedor: boolean
  isReadonly: boolean
  canEdit: boolean
  canDelete: boolean
  canViewFinanzas: boolean
}

export function useTienda(): UseTiendaResult {
  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTienda() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Primero buscar como owner
      const { data: tiendaOwner } = await supabase
        .from('tiendas')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (tiendaOwner) {
        setTienda(tiendaOwner as Tienda)
        setRol('owner')
        setLoading(false)
        return
      }

      // Si no es owner, buscar como miembro
      const { data: membresia } = await supabase
        .from('miembros')
        .select('tienda_id, rol')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membresia) {
        const { data: tiendaMiembro } = await supabase
          .from('tiendas')
          .select('*')
          .eq('id', membresia.tienda_id)
          .maybeSingle()

        if (tiendaMiembro) {
          setTienda(tiendaMiembro as Tienda)
          setRol(membresia.rol as Rol)
        }
      }

      setLoading(false)
    }

    void fetchTienda()
  }, [])

  const isOwner = rol === 'owner'
  const isAdmin = rol === 'admin'
  const isVendedor = rol === 'vendedor'
  const isReadonly = rol === 'readonly'
  const canEdit = isOwner || isAdmin || isVendedor
  const canDelete = isOwner || isAdmin
  const canViewFinanzas = isOwner || isAdmin

  return { tienda, loading, rol, isOwner, isAdmin, isVendedor, isReadonly, canEdit, canDelete, canViewFinanzas }
}
