import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function CuentaBloqueadaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre')
    .eq('owner_id', user.id)
    .maybeSingle()

  let planNombre: string | null = null
  let fechaVencimiento: string | null = null

  if (tienda) {
    const { data: sus } = await supabase
      .from('suscripciones')
      .select('estado, fecha_fin, plan_id, planes(nombre)')
      .eq('tienda_id', tienda.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sus) {
      fechaVencimiento = sus.fecha_fin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      planNombre = (sus as any).planes?.nombre ?? null
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#1E3A2F" />
            <circle cx="16" cy="14" r="9" fill="none" stroke="#FAF6F0" strokeWidth="2.5" />
            <circle cx="16" cy="14" r="4" fill="none" stroke="#FAF6F0" strokeWidth="2" />
            <circle cx="16" cy="14" r="1.5" fill="#C4622D" />
            <line x1="16" y1="23" x2="16" y2="29" stroke="#C4622D" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="font-serif text-xl font-bold text-[#1A1510] leading-none">POLEA</p>
        </div>

        <div className="w-16 h-16 rounded-full bg-[#C44040]/10 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C44040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#1A1510]">Tu cuenta está pausada</h1>
          <p className="text-[#6A5D52] mt-2 text-sm leading-relaxed">
            {tienda ? (
              <>La suscripción de <strong>{tienda.nombre}</strong> ha vencido.</>
            ) : (
              <>Tu suscripción ha vencido y el acceso está temporalmente bloqueado.</>
            )}
          </p>
          {planNombre && fechaVencimiento && (
            <p className="text-[#9A8C80] text-xs mt-2">
              Plan {planNombre} · Venció el{' '}
              {new Date(`${fechaVencimiento}`).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 text-left space-y-3">
          <p className="text-sm font-semibold text-[#1A1510]">¿Qué pasó?</p>
          <p className="text-sm text-[#6A5D52] leading-relaxed">
            No pudimos procesar el pago de tu suscripción. Para reactivar tu cuenta y recuperar acceso
            a todos tus datos, contáctanos y lo resolvemos rápido.
          </p>
          <p className="text-xs text-[#9A8C80]">
            Tus datos están seguros — no se ha eliminado nada.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="mailto:polealabs@gmail.com?subject=Reactivar%20mi%20cuenta%20Polea"
            className="block w-full py-3 rounded-xl bg-[#C4622D] text-white text-sm font-semibold hover:bg-[#A8521F] transition text-center"
          >
            Contactar a Polea para reactivar
          </a>
          <Link
            href="/suscripcion"
            className="block w-full py-3 rounded-xl border border-[#EDE5DC] text-[#4A3F35] text-sm font-medium hover:bg-[#F3ECE4] transition text-center"
          >
            Ver detalles de mi suscripción
          </Link>
        </div>

        <p className="text-xs text-[#9A8C80]">
          ¿Ya resolviste el pago?{' '}
          <Link href="/dashboard" className="text-[#C4622D] hover:underline">
            Intentar ingresar de nuevo
          </Link>
        </p>
      </div>
    </div>
  )
}
