'use client'

import { useMemo, useState } from 'react'
import { getMargenPorIndustria } from '@/lib/tipos-industria'

interface CalculadoraPreciosProps {
  onClose: () => void
  onAplicar: (precio: number, costo: number) => void
  costoInicial?: number
  industria?: string
  nombreProducto?: string
}

export default function CalculadoraPrecios({
  onClose,
  onAplicar,
  costoInicial = 0,
  industria = '',
  nombreProducto = 'Tu producto',
}: CalculadoraPreciosProps) {
  const margenIndustria = getMargenPorIndustria(industria)

  const [costoBase, setCostoBase] = useState(costoInicial)
  const [costoEmpaque, setCostoEmpaque] = useState(0)
  const [costoEnvio, setCostoEnvio] = useState(0)
  const [otrosCostos, setOtrosCostos] = useState(0)

  const [tiempoMinutos, setTiempoMinutos] = useState(0)
  const [valorHora, setValorHora] = useState(0)

  const [gastosFijosTotal, setGastosFijosTotal] = useState(0)
  const [unidadesMes, setUnidadesMes] = useState(30)

  const [margenObjetivo, setMargenObjetivo] = useState(margenIndustria.margenRecomendado)

  function formatCOP(n: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Math.round(n))
  }

  const costeTiempo = (tiempoMinutos / 60) * valorHora
  const gastosFijosUnitario = unidadesMes > 0 ? gastosFijosTotal / unidadesMes : 0
  const costoTotal =
    costoBase + costoEmpaque + costoEnvio + otrosCostos + costeTiempo + gastosFijosUnitario

  const precioSugerido = costoTotal > 0 ? costoTotal / (1 - margenObjetivo / 100) : 0
  const precioMinimo = costoTotal > 0 ? costoTotal / (1 - margenIndustria.margenMinimo / 100) : 0
  const precioMaximo = precioSugerido * 1.15
  const gananciaUnitaria = precioSugerido - costoTotal
  const margenReal = precioSugerido > 0 ? ((precioSugerido - costoTotal) / precioSugerido) * 100 : 0

  const margenStatus = useMemo(() => {
    if (margenReal < margenIndustria.margenMinimo * 0.7) {
      return {
        color: '#C44040',
        bg: 'rgba(196,64,64,0.12)',
        label: '⚠ Margen muy bajo — podrías estar perdiendo dinero',
        barColor: '#C44040',
      }
    }
    if (margenReal < margenIndustria.margenMinimo) {
      return {
        color: '#D4A853',
        bg: 'rgba(212,168,83,0.12)',
        label: '↗ Margen aceptable — considera subir el precio',
        barColor: '#D4A853',
      }
    }
    if (margenReal <= margenIndustria.margenPremium) {
      return {
        color: '#2D6A4F',
        bg: 'rgba(45,106,79,0.12)',
        label: `✓ Margen saludable para ${margenIndustria.industria}`,
        barColor: '#3A7D5A',
      }
    }
    return {
      color: '#3A7D5A',
      bg: 'rgba(45,106,79,0.15)',
      label: '🚀 Margen premium — excelente posicionamiento',
      barColor: '#3A7D5A',
    }
  }, [
    margenReal,
    margenIndustria.margenMinimo,
    margenIndustria.margenPremium,
    margenIndustria.industria,
  ])

  const insight = useMemo(() => {
    if (costoTotal === 0) return 'Ingresa tus costos para ver el análisis.'
    const gananciaTotal = unidadesMes * gananciaUnitaria
    let texto = `Con <strong>${unidadesMes} unidades al mes</strong> a este precio, ganarías <strong>${formatCOP(gananciaTotal)}</strong> de utilidad.`
    if (margenReal < 20) {
      texto += ` ⚠ Margen muy bajo. Considera subir el precio o reducir costos.`
    } else if (margenReal >= 35 && margenReal <= 65) {
      texto += ` 💡 Para ventas por WhatsApp puedes cobrar hasta <strong>${formatCOP(precioSugerido * 1.1)}</strong> — la atención personalizada justifica un precio 10% más alto.`
    } else if (margenReal > 65) {
      texto += ` 🎯 Excelente margen. Asegúrate de comunicar bien el valor — el packaging y la presentación son clave a este precio.`
    }
    return texto
  }, [costoTotal, unidadesMes, gananciaUnitaria, margenReal, precioSugerido])

  const inputClass =
    'w-full px-3 py-2 rounded-lg border text-sm outline-none transition'
  const inputStyle = {
    borderColor: 'var(--color-border)',
    background: 'var(--color-background)',
    color: 'var(--color-text)',
  }
  const labelClass = 'block text-xs font-semibold mb-1'
  const labelStyle = { color: 'var(--color-text-soft)' }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div
        className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
              🧮 Calculadora de precio
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
              {nombreProducto} · Márgenes de {margenIndustria.industria}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-xl" style={{ color: 'var(--color-text-soft)' }}>
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="p-6 space-y-5 border-r md:border-r" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Costos variables
              </p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Costo del producto *
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    style={inputStyle}
                    value={costoBase === 0 ? '' : costoBase}
                    onChange={(e) => setCostoBase(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="Costo de fabricación o compra"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Empaque
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      style={inputStyle}
                      value={costoEmpaque === 0 ? '' : costoEmpaque}
                      onChange={(e) => setCostoEmpaque(e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Envío
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      style={inputStyle}
                      value={costoEnvio === 0 ? '' : costoEnvio}
                      onChange={(e) => setCostoEnvio(e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Otros costos variables
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    style={inputStyle}
                    value={otrosCostos === 0 ? '' : otrosCostos}
                    onChange={(e) => setOtrosCostos(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="Comisión pasarela, materiales..."
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Tu tiempo (opcional)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Minutos por unidad
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    style={inputStyle}
                    value={tiempoMinutos === 0 ? '' : tiempoMinutos}
                    onChange={(e) => setTiempoMinutos(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Valor de tu hora
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    style={inputStyle}
                    value={valorHora === 0 ? '' : valorHora}
                    onChange={(e) => setValorHora(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              {costeTiempo > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
                  Costo de tu tiempo: {formatCOP(costeTiempo)} / unidad
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Gastos fijos (opcional)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Total gastos fijos / mes
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    style={inputStyle}
                    value={gastosFijosTotal === 0 ? '' : gastosFijosTotal}
                    onChange={(e) => setGastosFijosTotal(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="Arriendo, nómina..."
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Unidades que vendes / mes
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    style={inputStyle}
                    value={unidadesMes}
                    onChange={(e) => setUnidadesMes(Math.max(1, Number(e.target.value)))}
                    placeholder="30"
                  />
                </div>
              </div>
              {gastosFijosUnitario > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
                  Gasto fijo por unidad: {formatCOP(gastosFijosUnitario)}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                  Tu margen objetivo
                </p>
                <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                  {margenObjetivo}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                value={margenObjetivo}
                onChange={(e) => setMargenObjetivo(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
                <span>Mínimo {margenIndustria.margenMinimo}%</span>
                <span>Recomendado {margenIndustria.margenRecomendado}%</span>
                <span>Premium {margenIndustria.margenPremium}%</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4" style={{ background: 'var(--color-background)' }}>
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-primary)' }}>
              <p className="text-xs uppercase tracking-wide text-white/60 mb-1">Precio sugerido de venta</p>
              <p className="font-serif text-3xl font-bold text-white">{formatCOP(precioSugerido)}</p>
              {costoTotal > 0 && (
                <p className="text-xs text-white/60 mt-1">
                  Rango: {formatCOP(precioMinimo)} – {formatCOP(precioMaximo)}
                </p>
              )}
            </div>

            {costoTotal > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--color-text-soft)' }}>Tu margen real</span>
                  <span className="font-bold" style={{ color: margenStatus.color }}>
                    {Math.round(margenReal)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(margenReal, 100)}%`, background: margenStatus.barColor }}
                  />
                </div>
                <div
                  className="rounded-lg px-3 py-2 mt-2 text-xs font-medium"
                  style={{ background: margenStatus.bg, color: margenStatus.color }}
                >
                  {margenStatus.label}
                </div>
              </div>
            )}

            {costoTotal > 0 && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-soft)' }}>
                  Desglose del costo
                </p>
                {[
                  { label: 'Costo del producto', valor: costoBase, color: 'var(--color-accent)' },
                  {
                    label: 'Empaque y envío',
                    valor: costoEmpaque + costoEnvio + otrosCostos,
                    color: '#D4A853',
                  },
                  { label: 'Tu tiempo', valor: costeTiempo, color: '#7BA7D4' },
                  { label: 'Gastos fijos / unidad', valor: gastosFijosUnitario, color: 'var(--color-text-soft)' },
                ]
                  .filter((i) => i.valor > 0)
                  .map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span style={{ color: 'var(--color-text-soft)' }}>{item.label}</span>
                      </div>
                      <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {formatCOP(item.valor)}
                      </span>
                    </div>
                  ))}
                <div
                  className="border-t pt-2 flex justify-between text-xs font-bold"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span style={{ color: 'var(--color-text)' }}>Costo total real</span>
                  <span style={{ color: 'var(--color-text)' }}>{formatCOP(costoTotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span style={{ color: '#3A7D5A' }}>Ganancia por unidad</span>
                  <span style={{ color: '#3A7D5A' }}>{formatCOP(gananciaUnitaria)}</span>
                </div>
              </div>
            )}

            {costoTotal > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-soft)' }}>
                  Si vendes este mes...
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[10, unidadesMes, 50].map((u, i) => (
                    <div
                      key={`${u}-${i}`}
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: i === 1 ? 'var(--color-accent-pale)' : 'var(--color-surface)',
                        border: i === 1 ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      }}
                    >
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>
                        {u} uds
                      </p>
                      <p className="text-sm font-bold font-serif mt-1" style={{ color: 'var(--color-text)' }}>
                        {formatCOP(u * precioSugerido)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#3A7D5A' }}>
                        +{formatCOP(u * gananciaUnitaria)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {costoTotal > 0 && (
              <div
                className="rounded-xl p-4 text-xs leading-relaxed"
                style={{ background: 'var(--color-accent-pale)', border: '1px solid var(--color-border)' }}
              >
                <p className="font-semibold mb-1" style={{ color: 'var(--color-accent)' }}>
                  ✦ Análisis
                </p>
                <p style={{ color: 'var(--color-text-soft)' }} dangerouslySetInnerHTML={{ __html: insight }} />
              </div>
            )}

            <button
              type="button"
              disabled={precioSugerido === 0}
              onClick={() => onAplicar(Math.round(precioSugerido), costoBase)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              ✓ Aplicar {formatCOP(Math.round(precioSugerido))} al producto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
