import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LevaLogo } from '@/components/ui/LevaLogo'

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
    <div className="min-h-screen bg-[#F4F1EA] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <LevaLogo size={32} />
          <p className="font-serif text-xl font-bold text-[#16140F] leading-none">LEVA</p>
        </div>

        <div className="w-16 h-16 rounded-full bg-[#C44040]/10 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C44040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#16140F]">Tu cuenta está pausada</h1>
          <p className="text-[#4A463C] mt-2 text-sm leading-relaxed">
            {tienda ? (
              <>La suscripción de <strong>{tienda.nombre}</strong> ha vencido.</>
            ) : (
              <>Tu suscripción ha vencido y el acceso está temporalmente bloqueado.</>
            )}
          </p>
          {planNombre && fechaVencimiento && (
            <p className="text-[#6E6860] text-xs mt-2">
              Plan {planNombre} · Venció el{' '}
              {new Date(`${fechaVencimiento}`).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#DCD7CA] p-6 text-left space-y-3">
          <p className="text-sm font-semibold text-[#16140F]">¿Qué pasó?</p>
          <p className="text-sm text-[#4A463C] leading-relaxed">
            No pudimos procesar el pago de tu suscripción. Para reactivar tu cuenta y recuperar acceso
            a todos tus datos, contáctanos y lo resolvemos rápido.
          </p>
          <p className="text-xs text-[#6E6860]">
            Tus datos están seguros — no se ha eliminado nada.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="mailto:polealabs@gmail.com?subject=Reactivar%20mi%20cuenta%20Leva"
            className="block w-full py-3 rounded-xl bg-[#4A90D9] text-white text-sm font-semibold hover:bg-[#5C9FE0] transition text-center"
          >
            Contactar a Leva para reactivar
          </a>
          <Link
            href="/suscripcion"
            className="block w-full py-3 rounded-xl border border-[#DCD7CA] text-[#4A463C] text-sm font-medium hover:bg-[#E8F2FB] transition text-center"
          >
            Ver detalles de mi suscripción
          </Link>
        </div>

        <p className="text-xs text-[#6E6860]">
          ¿Ya resolviste el pago?{' '}
          <Link href="/dashboard" className="text-[#4A90D9] hover:underline">
            Intentar ingresar de nuevo
          </Link>
        </p>
      </div>
    </div>
  )
}
