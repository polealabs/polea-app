'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { aceptarInvitacion } from '@/app/(dashboard)/equipo/actions'

type Estado = 'cargando' | 'exito' | 'error' | 'login-requerido'

export default function InvitacionPage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const tokenParam = params?.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  const [estado, setEstado] = useState<Estado>('cargando')
  const [mensaje, setMensaje] = useState('Validando invitación...')

  useEffect(() => {
    if (!token) {
      const invalidTimeoutId = window.setTimeout(() => {
        setEstado('error')
        setMensaje('Token de invitación inválido.')
      }, 0)
      return () => window.clearTimeout(invalidTimeoutId)
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const result = await aceptarInvitacion(token)
        if (result?.ok) {
          setEstado('exito')
          setMensaje('¡Bienvenido al equipo! Ya tienes acceso a la tienda.')
          return
        }

        const err = result?.error ?? 'No se pudo procesar la invitación.'
        if (err.includes('Debes iniciar sesión')) {
          setEstado('login-requerido')
          setMensaje(err)
          return
        }

        setEstado('error')
        setMensaje(err)
      })()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [token])

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#1E3A2F]">POLEA</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#1A1510]/8 p-8 text-center">
          {estado === 'cargando' && (
            <>
              <p className="text-sm text-[#8A7D72]">{mensaje}</p>
            </>
          )}

          {estado === 'exito' && (
            <>
              <p className="text-sm text-[#1E3A2F] font-medium">{mensaje}</p>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="mt-5 bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-2.5 px-4 rounded-lg transition"
              >
                Ir al dashboard
              </button>
            </>
          )}

          {estado === 'login-requerido' && (
            <>
              <p className="text-sm text-[#8A7D72]">{mensaje}</p>
              <button
                type="button"
                onClick={() =>
                  router.push(`/login?redirect=${encodeURIComponent(`/invitacion/${token}`)}`)
                }
                className="mt-5 bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-2.5 px-4 rounded-lg transition"
              >
                Iniciar sesión
              </button>
            </>
          )}

          {estado === 'error' && (
            <>
              <p className="text-sm text-[#C44040]">{mensaje}</p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="mt-5 border border-[#EDE5DC] text-[#1A1510] font-medium py-2.5 px-4 rounded-lg hover:bg-[#FAF6F0] transition"
              >
                Volver al inicio
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
