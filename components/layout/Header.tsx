'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import {
  generarNotificaciones,
  obtenerNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  type Notificacion,
} from '@/lib/notificaciones'

interface Props {
  titulo: string
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const horas = Math.floor(diff / (1000 * 60 * 60))
  if (horas < 1) return 'Hace menos de 1 hora'
  if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`
  const dias = Math.floor(horas / 24)
  return `Hace ${dias} día${dias > 1 ? 's' : ''}`
}

function iconoTipo(tipo: Notificacion['tipo']) {
  switch (tipo) {
    case 'stock_bajo':
      return '📦'
    case 'sin_movimiento':
      return '⏸'
    case 'cliente_recurrente':
      return '👥'
    case 'ventas_bajas':
      return '📉'
    default:
      return '🔔'
  }
}

function destinoTipo(tipo: Notificacion['tipo']) {
  switch (tipo) {
    case 'stock_bajo':
      return '/productos?filtro=stock-bajo'
    case 'sin_movimiento':
      return '/productos'
    case 'cliente_recurrente':
      return '/clientes'
    case 'ventas_bajas':
      return '/reportes'
    default:
      return '/dashboard'
  }
}

export default function Header({ titulo }: Props) {
  const { tienda } = useTienda()
  const router = useRouter()
  const [showPerfil, setShowPerfil] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loadingNotif, setLoadingNotif] = useState(false)
  const [notifInicializadas, setNotifInicializadas] = useState(false)
  const perfilRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const noLeidas = notificaciones.filter((n) => !n.leida).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) {
        setShowPerfil(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const cargarNotificaciones = useCallback(async () => {
    if (!tienda) return
    setLoadingNotif(true)
    await generarNotificaciones(tienda.id)
    const lista = await obtenerNotificaciones(tienda.id)
    setNotificaciones(lista)
    setLoadingNotif(false)
    setNotifInicializadas(true)
  }, [tienda])

  useEffect(() => {
    if (!showNotif || !tienda || notifInicializadas) return
    const timeoutId = window.setTimeout(() => {
      void cargarNotificaciones()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [cargarNotificaciones, notifInicializadas, showNotif, tienda])

  async function handleMarcarTodas() {
    if (!tienda || noLeidas === 0) return
    await marcarTodasLeidas(tienda.id)
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
  }

  async function handleAbrirNotificacion(notif: Notificacion) {
    if (!notif.leida) {
      await marcarLeida(notif.id)
      setNotificaciones((prev) => prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n)))
    }
    setShowNotif(false)
    router.push(destinoTipo(notif.tipo))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-[#EDE5DC] flex items-center justify-between px-6 sticky top-0 z-20">
      <h2 className="text-sm font-semibold text-[#1A1510] pl-12 lg:pl-0">{titulo}</h2>

      <div className="flex items-center gap-1">
        <Link
          href="/ayuda"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A7D72] hover:bg-[#FAF6F0] hover:text-[#1A1510] transition"
          title="Ayuda y documentación"
        >
          <span className="text-base">📄</span>
        </Link>

        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setShowNotif((v) => !v)
              setShowPerfil(false)
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A7D72] hover:bg-[#FAF6F0] hover:text-[#1A1510] transition relative"
            title="Notificaciones"
          >
            <span className="text-base">🔔</span>
            {noLeidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C44040] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-[#EDE5DC] overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#EDE5DC] flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#1A1510]">Notificaciones</p>
                {noLeidas > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleMarcarTodas()}
                    className="text-[11px] text-[#C4622D] font-medium hover:underline"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {loadingNotif ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="animate-pulse">
                        <div className="h-3 bg-[#F3ECE4] rounded w-2/3 mb-2" />
                        <div className="h-2.5 bg-[#F3ECE4] rounded w-full mb-1.5" />
                        <div className="h-2.5 bg-[#F3ECE4] rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : notificaciones.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-[#8A7D72]">No tienes notificaciones nuevas</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {notificaciones.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => void handleAbrirNotificacion(notif)}
                        className={`w-full text-left px-4 py-3 hover:bg-[#FAF6F0] transition border-b border-[#F3ECE4] last:border-b-0 ${
                          notif.leida ? 'bg-white' : 'bg-[#FAF6F0]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-base leading-none mt-0.5">{iconoTipo(notif.tipo)}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1A1510] truncate">{notif.titulo}</p>
                            <p className="text-xs text-[#6A5D52] mt-0.5 leading-snug">{notif.mensaje}</p>
                            <p className="text-[11px] text-[#9A8C80] mt-1">{tiempoRelativo(notif.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-[#EDE5DC]">
                <Link href="/preferencias" className="text-xs text-[#C4622D] font-medium hover:underline block">
                  Configurar alertas →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div ref={perfilRef} className="relative ml-1">
          <button
            onClick={() => {
              setShowPerfil((v) => !v)
              setShowNotif(false)
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#FAF6F0] transition"
            title="Mi perfil"
          >
            <div className="w-7 h-7 rounded-full bg-[#C4622D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
              {tienda?.logo_url ? (
                <img src={tienda.logo_url} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <span>{tienda?.nombre?.charAt(0)?.toUpperCase() ?? 'P'}</span>
              )}
            </div>
            <span className="text-xs font-medium text-[#1A1510] max-w-[120px] truncate hidden sm:block">
              {tienda?.nombre ?? 'Mi tienda'}
            </span>
          </button>

          {showPerfil && (
            <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-xl border border-[#EDE5DC] overflow-hidden z-50">
              <div className="px-4 py-4 bg-[#FAF6F0] border-b border-[#EDE5DC]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C4622D] flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                    {tienda?.logo_url ? (
                      <img src={tienda.logo_url} alt="logo" className="w-full h-full object-cover" />
                    ) : (
                      <span>{tienda?.nombre?.charAt(0)?.toUpperCase() ?? 'P'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1510] truncate">{tienda?.nombre}</p>
                    <p className="text-xs text-[#8A7D72] truncate">{tienda?.categoria ?? 'Sin categoría'}</p>
                    {tienda?.ciudad && <p className="text-xs text-[#8A7D72]">{tienda.ciudad}</p>}
                  </div>
                </div>
              </div>
              <div className="py-1">
                <Link
                  href="/perfil"
                  onClick={() => setShowPerfil(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4A3F35] hover:bg-[#FAF6F0] transition"
                >
                  <span>⚙</span> Configuración de tienda
                </Link>
                <Link
                  href="/preferencias"
                  onClick={() => setShowPerfil(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4A3F35] hover:bg-[#FAF6F0] transition"
                >
                  <span>🔔</span> Preferencias y alertas
                </Link>
                <Link
                  href="/ayuda"
                  onClick={() => setShowPerfil(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4A3F35] hover:bg-[#FAF6F0] transition"
                >
                  <span>📄</span> Ayuda y documentación
                </Link>
              </div>
              <div className="border-t border-[#EDE5DC] py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#C44040] hover:bg-[#FDEAEA] transition"
                >
                  <span>→</span> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
