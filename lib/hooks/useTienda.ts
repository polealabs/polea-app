'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tienda } from '@/lib/types'

export function useTienda() {
  const [tienda, setTienda] = useState<Tienda | null>(null)
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

      const { data } = await supabase
        .from('tiendas')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      setTienda(data)
      setLoading(false)
    }
    fetchTienda()
  }, [])

  return { tienda, loading }
}
