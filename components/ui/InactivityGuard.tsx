'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INACTIVITY_DAYS = 30
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000
const STORAGE_KEY = 'polea_last_activity'

function updateActivity() {
  localStorage.setItem(STORAGE_KEY, Date.now().toString())
}

export default function InactivityGuard() {
  const router = useRouter()

  useEffect(() => {
    async function checkInactivity() {
      const last = localStorage.getItem(STORAGE_KEY)
      if (last && Date.now() - parseInt(last) > INACTIVITY_MS) {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        return
      }
      updateActivity()
    }

    checkInactivity()

    // Actualiza timestamp al detectar actividad, máximo una vez por minuto
    let lastUpdate = Date.now()
    function onActivity() {
      const now = Date.now()
      if (now - lastUpdate > 60_000) {
        lastUpdate = now
        updateActivity()
      }
    }

    // Re-verifica al volver a la pestaña después de tiempo inactivo
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') checkInactivity()
    }

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [router])

  return null
}
