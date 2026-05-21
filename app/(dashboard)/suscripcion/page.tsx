import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

const ESTADO_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: 'Período de prueba', color: '#D4A853', bg: '#FEF9EE' },
  activa: { label: 'Activa', color: '#3A7D5A', bg: '#EDF7F2' },
  gracia: { label: 'Pago pendiente', color: '#C44040', bg: '#FDEAEA' },
  vencida: { label: 'Vencida', color: '#C44040', bg: '#FDEAEA' },
  cancelada: { label: 'Cancelada', color: '#9A8C80', bg: '#F3ECE4' },
}

export default async function SuscripcionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre, es_beta, beta_hasta')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!tienda) redirect('/dashboard')

  const esBetaVigente = tienda.es_beta && tienda.beta_hasta && new Date(tienda.beta_hasta) > new Date()

  const { data: sus } = await supabase
    .from('suscripciones')
    .select('*, planes(*)')
    .eq('tienda_id', tienda.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: cobros } = await supabase
    .from('cobros')
    .select('*, planes(nombre)')
    .eq('tienda_id', tienda.id)
    .order('fecha_cobro', { ascending: false })
    .limit(10)

  const { data: planesDisponibles } = await supabase
    .from('planes')
    .select('*')
    .eq('activo', true)
    .order('orden')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = (sus as any)?.planes ?? null
  const estadoInfo = sus ? (ESTADO_LABELS[sus.estado] ?? ESTADO_LABELS.vencida) : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Mi suscripción
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
          {tienda.nombre}
        </p>
      </div>

      {esBetaVigente && (
        <div className="rounded-2xl p-5 border border-violet-200 bg-violet-50 flex items-start gap-4">
          <span className="text-xl mt-0.5">🧪</span>
          <div>
            <p className="font-semibold text-violet-800 text-sm">Acceso Beta activo</p>
            <p className="text-violet-600 text-xs mt-0.5">
              Tienes acceso completo a Polea como usuario beta hasta el{' '}
              {new Date(tienda.beta_hasta!).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              . Al vencer, necesitarás activar una suscripción.
            </p>
          </div>
        </div>
      )}

      {sus ? (
        <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>Plan actual</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>{plan?.nombre ?? '—'}</p>
              {plan?.descripcion && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-soft)' }}>{plan.descripcion}</p>
              )}
            </div>
            {estadoInfo && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: estadoInfo.bg, color: estadoInfo.color }}
              >
                {estadoInfo.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Periodicidad</p>
              <p className="text-sm font-medium mt-0.5 capitalize" style={{ color: 'var(--color-text)' }}>
                {sus.periodicidad}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                {sus.estado === 'trial' ? 'Trial hasta' : 'Próximo cobro'}
              </p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>
                {sus.fecha_fin
                  ? new Date(sus.fecha_fin).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Precio</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>
                {plan
                  ? sus.periodicidad === 'mensual'
                    ? `${formatCOP(plan.precio_mensual)}/mes`
                    : `${formatCOP(plan.precio_anual)}/año`
                  : '—'}
              </p>
            </div>
          </div>

          {plan?.funcionalidades?.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-faint)' }}>Incluye</p>
              <div className="flex flex-wrap gap-2">
                {plan.funcionalidades.map((f: string) => (
                  <span
                    key={f}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--color-accent-pale)', color: 'var(--color-accent)' }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border p-6 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            Aún no tienes una suscripción activa.
          </p>
        </div>
      )}

      {planesDisponibles && planesDisponibles.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Planes disponibles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {planesDisponibles.map((p) => {
              const esCurrent = sus && sus.plan_id === p.id
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border p-5 space-y-3"
                  style={{
                    background: esCurrent ? 'var(--color-accent-pale)' : 'var(--color-surface)',
                    borderColor: esCurrent ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{p.nombre}</p>
                    {esCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent)', color: 'white' }}>
                        Tu plan
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                      {formatCOP(p.precio_mensual)}<span className="text-xs font-normal" style={{ color: 'var(--color-text-soft)' }}>/mes</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                      o {formatCOP(p.precio_anual)}/año · {p.descuento_anual_porcentaje}% de descuento
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {(p.funcionalidades as string[]).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-soft)' }}>
                        <span style={{ color: 'var(--color-accent)' }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-center pt-1" style={{ color: 'var(--color-text-faint)' }}>
            Para cambiar de plan o actualizar tu método de pago,{' '}
            <a href="mailto:polealabs@gmail.com" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
              contáctanos
            </a>
            .
          </p>
        </div>
      )}

      {cobros && cobros.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Historial de cobros</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>Fecha</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>Plan</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>Monto</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cobros.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-soft)' }}>
                    {new Date(c.fecha_cobro).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-soft)' }}>{(c as any).planes?.nombre ?? '—'}</td>
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{formatCOP(c.monto)}</td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: c.estado === 'exitoso' ? '#EDF7F2' : c.estado === 'fallido' ? '#FDEAEA' : '#F3ECE4',
                        color: c.estado === 'exitoso' ? '#3A7D5A' : c.estado === 'fallido' ? '#C44040' : '#9A8C80',
                      }}
                    >
                      {c.estado === 'exitoso' ? 'Exitoso' : c.estado === 'fallido' ? 'Fallido' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
