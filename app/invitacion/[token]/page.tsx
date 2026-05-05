'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { aceptarInvitacion } from '@/app/(dashboard)/equipo/actions'

type Paso =
  | 'cargando'
  | 'bienvenida'
  | 'login'
  | 'registro'
  | 'confirmar-email'
  | 'procesando'
  | 'exito'
  | 'error'

interface DatosInvitacion {
  email: string
  rol: string
  tienda_nombre: string
  owner_nombre: string
  aceptada: boolean
  expires_at: string
}

export default function InvitacionPage() {
  const params = useParams<{ token: string }>()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  const router = useRouter()

  const [paso, setPaso] = useState<Paso>('cargando')
  const [mensaje, setMensaje] = useState('')
  const [inv, setInv] = useState<DatosInvitacion | null>(null)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setPaso('error')
      setMensaje('Link de invitación inválido.')
      return
    }
    void cargarInvitacion()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cargar solo al montar / cambiar token
  }, [token])

  async function cargarInvitacion() {
    const supabase = createClient()

    const { data } = await supabase
      .from('invitaciones')
      .select('email, rol, aceptada, expires_at, tienda_id, tiendas(nombre, owner_id)')
      .eq('token', token)
      .maybeSingle()

    if (!data) {
      setPaso('error')
      setMensaje('Esta invitación no existe o el link es incorrecto.')
      return
    }

    if (data.aceptada) {
      setPaso('error')
      setMensaje('Esta invitación ya fue aceptada anteriormente.')
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setPaso('error')
      setMensaje('Esta invitación expiró. Pide al dueño de la tienda que genere una nueva.')
      return
    }

    const tienda = data.tiendas as { nombre?: string; owner_id?: string } | null
    const tiendaNombre = tienda?.nombre ?? 'la tienda'
    const ownerId = tienda?.owner_id

    let ownerNombre = 'El equipo de'
    if (ownerId) {
      const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', ownerId).maybeSingle()
      if (perfil?.nombre) ownerNombre = perfil.nombre
    }

    const datosInv: DatosInvitacion = {
      email: data.email,
      rol: data.rol,
      tienda_nombre: tiendaNombre,
      owner_nombre: ownerNombre,
      aceptada: data.aceptada,
      expires_at: data.expires_at,
    }
    setInv(datosInv)
    setEmail(data.email)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await procesarAceptacion()
    } else {
      setPaso('bienvenida')
    }
  }

  async function procesarAceptacion() {
    setPaso('procesando')
    await new Promise((r) => setTimeout(r, 800))
    const result = await aceptarInvitacion(token!)
    if (result?.ok) {
      setPaso('exito')
    } else {
      setPaso('error')
      setMensaje(result?.error ?? 'No se pudo aceptar la invitación.')
    }
  }

  async function handleRegistro() {
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio')
      return
    }
    if (!email.trim()) {
      setFormError('El email es obligatorio')
      return
    }
    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSubmitting(true)
    setFormError(null)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/invitacion/${token}`,
        data: { nombre: nombre.trim() },
      },
    })

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
      return
    }

    if (data.user) {
      await supabase.from('perfiles').upsert({
        id: data.user.id,
        nombre: nombre.trim(),
      })
    }

    if (!data.session) {
      setPaso('confirmar-email')
      setSubmitting(false)
      return
    }

    await procesarAceptacion()
    setSubmitting(false)
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setFormError('Completa email y contraseña')
      return
    }

    setSubmitting(true)
    setFormError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setFormError('Email o contraseña incorrectos')
      setSubmitting(false)
      return
    }

    await procesarAceptacion()
    setSubmitting(false)
  }

  function rolLabel(rol: string) {
    if (rol === 'admin') return 'Administrador'
    if (rol === 'vendedor') return 'Vendedor'
    if (rol === 'readonly') return 'Solo lectura'
    return rol
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[#EDE5DC] text-sm text-[#1A1510] bg-white focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 transition'
  const labelClass = 'block text-xs font-semibold text-[#4A3F35] mb-1.5'

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold text-[#1E3A2F]">POLEA</h1>
          <p className="text-xs text-[#8A7D72] uppercase tracking-widest mt-1">Tu tienda, clara</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#EDE5DC] overflow-hidden">
          {paso === 'cargando' && (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[#8A7D72]">Validando invitación...</p>
            </div>
          )}

          {paso === 'bienvenida' && inv && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#E8F5EE] flex items-center justify-center text-3xl mx-auto mb-4">
                  🎉
                </div>
                <h2 className="font-serif text-xl font-medium text-[#1E3A2F] mb-2">
                  {inv.owner_nombre} te invita a colaborar
                </h2>
                <div className="inline-flex items-center gap-2 bg-[#FAF6F0] border border-[#EDE5DC] rounded-xl px-4 py-2.5 mt-1">
                  <span className="text-lg">🏪</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#1A1510]">{inv.tienda_nombre}</p>
                    <p className="text-xs text-[#8A7D72]">Rol: {rolLabel(inv.rol)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 mt-6">
                <button
                  type="button"
                  onClick={() => setPaso('registro')}
                  className="w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  Crear mi cuenta y unirme →
                </button>
                <button
                  type="button"
                  onClick={() => setPaso('login')}
                  className="w-full border border-[#EDE5DC] text-[#1A1510] font-medium py-3 rounded-xl hover:bg-[#FAF6F0] transition text-sm"
                >
                  Ya tengo cuenta — Iniciar sesión
                </button>
              </div>
              <p className="text-xs text-center text-[#8A7D72] mt-4">
                La invitación fue enviada a <strong>{inv.email}</strong>
              </p>
            </div>
          )}

          {paso === 'registro' && inv && (
            <div className="p-8">
              <button
                type="button"
                onClick={() => setPaso('bienvenida')}
                className="text-xs text-[#8A7D72] hover:text-[#1A1510] mb-5 flex items-center gap-1"
              >
                ← Volver
              </button>
              <h2 className="font-serif text-xl font-medium text-[#1E3A2F] mb-1">Crea tu cuenta</h2>
              <p className="text-xs text-[#8A7D72] mb-6">
                Para unirte a <strong>{inv.tienda_nombre}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Tu nombre completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Valentina Sánchez"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className={inputClass}
                  />
                  {email && inv.email && email.toLowerCase() !== inv.email.toLowerCase() && (
                    <p className="text-xs text-[#C44040] mt-1.5 flex items-center gap-1">
                      ⚠ La invitación fue enviada a {inv.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={inputClass}
                  />
                </div>
                {formError && (
                  <p className="text-xs text-[#C44040] bg-[#FDEAEA] px-3 py-2.5 rounded-lg">{formError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void handleRegistro()}
                  disabled={submitting}
                  className="w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-3 rounded-xl transition text-sm disabled:opacity-50"
                >
                  {submitting ? 'Creando cuenta...' : 'Crear cuenta y unirme'}
                </button>
              </div>
            </div>
          )}

          {paso === 'login' && inv && (
            <div className="p-8">
              <button
                type="button"
                onClick={() => setPaso('bienvenida')}
                className="text-xs text-[#8A7D72] hover:text-[#1A1510] mb-5 flex items-center gap-1"
              >
                ← Volver
              </button>
              <h2 className="font-serif text-xl font-medium text-[#1E3A2F] mb-1">Iniciar sesión</h2>
              <p className="text-xs text-[#8A7D72] mb-6">
                Para unirte a <strong>{inv.tienda_nombre}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className={inputClass}
                  />
                </div>
                {formError && (
                  <p className="text-xs text-[#C44040] bg-[#FDEAEA] px-3 py-2.5 rounded-lg">{formError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void handleLogin()}
                  disabled={submitting}
                  className="w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-3 rounded-xl transition text-sm disabled:opacity-50"
                >
                  {submitting ? 'Ingresando...' : 'Ingresar y unirme'}
                </button>
              </div>
            </div>
          )}

          {paso === 'confirmar-email' && inv && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#FBF3E0] flex items-center justify-center text-3xl mx-auto mb-4">
                📧
              </div>
              <h2 className="font-serif text-xl font-medium text-[#1E3A2F] mb-2">Revisa tu correo</h2>
              <p className="text-sm text-[#4A3F35] mb-2">Te enviamos un email de confirmación a:</p>
              <p className="text-sm font-semibold text-[#1A1510] bg-[#FAF6F0] border border-[#EDE5DC] rounded-xl px-4 py-2.5 inline-block mb-4">
                {email}
              </p>
              <p className="text-sm text-[#8A7D72] mb-6 leading-relaxed">
                Haz clic en el link del correo para confirmar tu cuenta. Una vez confirmada, vuelve a abrir este link de
                invitación para completar tu acceso a <strong>{inv.tienda_nombre}</strong>.
              </p>
              <div className="bg-[#FAF6F0] border border-[#EDE5DC] rounded-xl p-4 text-xs text-[#8A7D72] text-left">
                <p className="font-semibold text-[#4A3F35] mb-1">¿No ves el correo?</p>
                <p>Revisa tu carpeta de spam o correo no deseado. El correo viene de noreply@mail.app.supabase.io</p>
              </div>
            </div>
          )}

          {paso === 'procesando' && (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[#8A7D72]">Procesando tu invitación...</p>
            </div>
          )}

          {paso === 'exito' && inv && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8F5EE] flex items-center justify-center text-3xl mx-auto mb-4">
                ✅
              </div>
              <h2 className="font-serif text-xl font-medium text-[#1E3A2F] mb-2">¡Bienvenido al equipo!</h2>
              <p className="text-sm text-[#8A7D72] mb-6 leading-relaxed">
                Ya tienes acceso a <strong className="text-[#1A1510]">{inv.tienda_nombre}</strong> como{' '}
                <strong className="text-[#1A1510]">{rolLabel(inv.rol)}</strong>.
              </p>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                Ir al dashboard →
              </button>
            </div>
          )}

          {paso === 'error' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#FDEAEA] flex items-center justify-center text-3xl mx-auto mb-4">
                ❌
              </div>
              <h2 className="font-serif text-xl font-medium text-[#C44040] mb-2">Invitación inválida</h2>
              <p className="text-sm text-[#8A7D72] mb-6">{mensaje}</p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="border border-[#EDE5DC] text-[#1A1510] font-medium py-2.5 px-6 rounded-xl hover:bg-[#FAF6F0] transition text-sm"
              >
                Volver al inicio
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#8A7D72] mt-6">
          ¿Problemas con la invitación?{' '}
          <a
            href="https://wa.me/573014140381"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C4622D] hover:underline font-medium"
          >
            Contáctanos
          </a>
        </p>
      </div>
    </div>
  )
}
