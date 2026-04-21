'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { obtenerDatosReporte, type DatosReporte } from './actions'
import { useTienda } from '@/lib/hooks/useTienda'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

function formatMes(mes: string) {
  const [year, month] = mes.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

function colorVariacion(v: number) {
  if (v > 0) return 'text-[#3A7D5A]'
  if (v < 0) return 'text-[#C44040]'
  return 'text-[#8A7D72]'
}

function Bombillo({ texto }: { texto: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex ml-1.5 align-middle">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        className="w-4 h-4 rounded-full bg-[#FBF3E0] border border-[#D4A853] inline-flex items-center justify-center text-[#D4A853] text-[9px] font-bold hover:bg-[#D4A853] hover:text-white transition flex-shrink-0"
      >
        💡
      </button>
      {show && (
        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 w-56 bg-[#1E3A2F] text-white text-xs rounded-xl p-3 z-50 shadow-xl leading-relaxed block">
          {texto}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1E3A2F] block" />
        </span>
      )}
    </span>
  )
}

export default function ReportesPage() {
  const { tienda, loading: tiendaLoading } = useTienda()
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7))
  const [datos, setDatos] = useState<DatosReporte | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const reporteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tienda) return
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        const data = await obtenerDatosReporte(mes)
        setDatos(data)
        setLoading(false)
      })()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [mes, tienda])

  async function exportarPDF() {
    if (!reporteRef.current || !datos) return
    setExportando(true)
    const { jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')

    const canvas = await html2canvas(reporteRef.current, {
      scale: 2,
      backgroundColor: '#FAF6F0',
      useCORS: true,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`reporte-${tienda?.nombre ?? 'polea'}-${mes}.pdf`)
    setExportando(false)
  }

  if (tiendaLoading || loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-6xl" rows={10} />
  }

  if (!datos) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-sm text-[#8A7D72]">No se pudieron cargar los datos del reporte.</p>
      </div>
    )
  }

  const sinActividad = datos.ventasNetas === 0 && datos.totalGastos === 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A2F]">Reportes</h1>
        <div className="flex items-center gap-2">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm bg-white" />
          <button
            type="button"
            onClick={() => void exportarPDF()}
            disabled={exportando}
            className="px-4 py-2 rounded-lg border border-[#C4622D] text-[#C4622D] text-sm font-medium hover:bg-[#F9EDE5] transition disabled:opacity-50"
          >
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <div ref={reporteRef} className="bg-[#FAF6F0] rounded-2xl p-4 sm:p-6">
        {sinActividad ? (
          <div className="text-center py-16">
            <p className="font-serif text-2xl text-[#1E3A2F] mb-2">Sin actividad este mes</p>
            <p className="text-sm text-[#8A7D72]">Registra ventas y gastos para ver tu estado de resultados.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Link href="/ventas" className="text-sm text-[#C4622D] font-medium hover:underline">
                Registrar venta →
              </Link>
              <Link href="/gastos" className="text-sm text-[#8A7D72] font-medium hover:underline">
                Registrar gasto →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#EDE5DC]">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8A7D72] mb-1">Estado de resultados</p>
                <h2 className="font-serif text-3xl font-medium text-[#1E3A2F] capitalize">{formatMes(mes)}</h2>
                <p className="text-sm text-[#8A7D72] mt-1">{tienda?.nombre}</p>
              </div>
              {datos.variacionVentas !== null && (
                <div className="text-right">
                  <p className="text-xs text-[#8A7D72]">vs mes anterior</p>
                  <p className={`text-2xl font-serif font-medium ${colorVariacion(datos.variacionVentas)}`}>
                    {datos.variacionVentas > 0 ? '+' : ''}
                    {datos.variacionVentas.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-2xl border border-[#EDE5DC] p-4 shadow-sm">
                <p className="text-xs text-[#8A7D72] mb-1 flex items-center">
                  Ventas netas
                  <Bombillo texto="Es el dinero que realmente recibiste después de descontar comisiones de plataformas de pago como Wompi o Bold." />
                </p>
                <p className="text-xl sm:text-2xl font-serif text-[#1E3A2F]">{formatCOP(datos.ventasNetas)}</p>
                <div className="h-1 bg-[#C4622D] rounded-full mt-3" />
              </div>

              <div className="bg-white rounded-2xl border border-[#EDE5DC] p-4 shadow-sm">
                <p className="text-xs text-[#8A7D72] mb-1 flex items-center">
                  Utilidad bruta
                  <Bombillo texto="Lo que te queda después de restar el costo de la mercancía que compraste. Si es negativo, estás vendiendo por debajo de lo que te cuesta producir." />
                </p>
                <p className={`text-xl sm:text-2xl font-serif ${datos.utilidadBruta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadBruta)}
                </p>
                <div className="h-1 bg-[#1E3A2F] rounded-full mt-3" />
              </div>

              <div className="bg-white rounded-2xl border border-[#EDE5DC] p-4 shadow-sm">
                <p className="text-xs text-[#8A7D72] mb-1 flex items-center">
                  Gastos totales
                  <Bombillo texto="Todos los gastos del mes: producción, empaque, envíos, marketing, etc." />
                </p>
                <p className="text-xl sm:text-2xl font-serif text-[#1E3A2F]">{formatCOP(datos.totalGastos)}</p>
                <div className="h-1 bg-[#D4A853] rounded-full mt-3" />
              </div>

              <div
                className={`rounded-2xl border p-4 shadow-sm ${
                  datos.utilidadNeta >= 0 ? 'bg-[#ECF6F0] border-[#D2E7DB]' : 'bg-[#FCEDED] border-[#F3D4D4]'
                }`}
              >
                <p className="text-xs text-[#8A7D72] mb-1 flex items-center">
                  Utilidad neta
                  <Bombillo texto="Lo que realmente ganaste este mes después de pagar todo — mercancía y gastos operativos. Este es el número más importante." />
                </p>
                <p className={`text-xl sm:text-2xl font-serif ${datos.utilidadNeta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadNeta)}
                </p>
                <div className={`h-1.5 rounded-full mt-3 ${datos.utilidadNeta >= 0 ? 'bg-[#3A7D5A]' : 'bg-[#C44040]'}`} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm mb-6">
              <h3 className="text-sm font-semibold text-[#1A1510] mb-5">Cómo se construyó tu resultado</h3>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-[#1A1510]">Ventas brutas</p>
                  <p className="text-xs text-[#8A7D72]">Lo que facturaste antes de descuentos y comisiones</p>
                </div>
                <p className="text-sm font-semibold text-[#1A1510]">{formatCOP(datos.ventasBrutas)}</p>
              </div>

              {datos.totalDescuentos > 0 && (
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-[#C4622D]">Descuentos</p>
                  <p className="text-sm font-semibold text-[#C4622D]">- {formatCOP(datos.totalDescuentos)}</p>
                </div>
              )}

              <div className="border-t border-[#EDE5DC] my-3" />

              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-bold text-[#1E3A2F]">Ventas netas</p>
                <p className="text-sm font-bold text-[#1E3A2F]">{formatCOP(datos.ventasNetas)}</p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-[#4A3F35] flex items-center">
                    Costo de mercancía
                    <Bombillo texto="Calculado con base en las entradas de stock registradas en el mes." />
                  </p>
                  <p className="text-xs text-[#8A7D72]">Costo de lo que compraste para vender</p>
                </div>
                <p className="text-sm font-semibold text-[#4A3F35]">- {formatCOP(datos.costoMercancia)}</p>
              </div>

              <div className="border-t border-[#EDE5DC] my-3" />

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <p className={`text-sm font-bold ${datos.utilidadBruta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                    Utilidad bruta
                  </p>
                  <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-[#F2F0EC] text-[#5A4F45]">
                    {datos.margenBruto.toFixed(1)}% margen
                  </span>
                  <Bombillo texto="El margen bruto te dice qué porcentaje de tus ventas se convierte en ganancia antes de gastos. Un margen saludable depende del sector, pero en general más del 40% es bueno." />
                </div>
                <p className={`text-sm font-bold ${datos.utilidadBruta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadBruta)}
                </p>
              </div>

              <div className="flex items-start justify-between py-2">
                <div>
                  <p className="text-sm text-[#4A3F35]">Gastos operacionales</p>
                  <div className="mt-1 pl-3">
                    {Object.entries(datos.gastosPorCategoria).map(([categoria, monto]) => (
                      <p key={categoria} className="text-xs text-[#8A7D72] flex justify-between gap-3">
                        <span>{categoria}</span>
                        <span>{formatCOP(monto)}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-semibold text-[#4A3F35]">- {formatCOP(datos.totalGastos)}</p>
              </div>

              <div className="border-t-2 border-b border-[#EDE5DC] my-3" />

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <p className={`text-lg font-bold ${datos.utilidadNeta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                    Utilidad neta
                  </p>
                  <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-[#F2F0EC] text-[#5A4F45]">
                    {datos.margenNeto.toFixed(1)}% margen neto
                  </span>
                  <Bombillo texto="Tu ganancia real del mes. Si es positiva, el negocio es rentable. Si es negativa, los costos superaron los ingresos — revisa qué gastos puedes optimizar." />
                </div>
                <p className={`text-lg font-bold ${datos.utilidadNeta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadNeta)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#1A1510]">Indicadores de ventas</h3>
                <div>
                  <p className="text-xs text-[#8A7D72] flex items-center">
                    Ticket promedio
                    <Bombillo texto="El valor promedio de cada venta. Subirlo es más eficiente que conseguir más clientes — considera combos o productos complementarios." />
                  </p>
                  <p className="text-xl font-serif text-[#1E3A2F]">{formatCOP(datos.ticketPromedio)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A7D72] flex items-center">
                    Transacciones
                    <Bombillo texto="Número de ventas registradas en el mes." />
                  </p>
                  <p className="text-xl font-serif text-[#1E3A2F]">{datos.totalTransacciones}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A7D72] flex items-center">
                    Unidades vendidas
                    <Bombillo texto="Total de productos despachados en el mes." />
                  </p>
                  <p className="text-xl font-serif text-[#1E3A2F]">{datos.unidadesVendidas}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm">
                  <p className="text-sm font-semibold text-[#1A1510] flex items-center">
                    ⭐ Producto estrella
                    <Bombillo texto="El producto que más unidades vendiste este mes. Asegúrate de tener siempre stock de él." />
                  </p>
                  {datos.productoMasVendido ? (
                    <>
                      <p className="text-lg font-serif text-[#1E3A2F] mt-2">{datos.productoMasVendido.nombre}</p>
                      <p className="text-xs text-[#8A7D72] mt-1">{datos.productoMasVendido.cantidad} unidades vendidas</p>
                    </>
                  ) : (
                    <p className="text-sm text-[#8A7D72] mt-2">Sin datos suficientes</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm">
                  <p className="text-sm font-semibold text-[#1A1510] flex items-center">
                    👑 Cliente top
                    <Bombillo texto="El cliente que más te compró este mes. Considera darle un trato especial o descuento para fidelizarlo." />
                  </p>
                  {datos.clienteQueMasCompro ? (
                    <>
                      <p className="text-lg font-serif text-[#1E3A2F] mt-2">{datos.clienteQueMasCompro.nombre}</p>
                      <p className="text-xs text-[#8A7D72] mt-1">{formatCOP(datos.clienteQueMasCompro.total)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-[#8A7D72] mt-2">Sin clientes registrados</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-[#1A1510] mb-4">Distribución de gastos</h3>
              {Object.entries(datos.gastosPorCategoria)
                .sort((a, b) => b[1] - a[1])
                .map(([categoria, monto]) => {
                  const pct = datos.totalGastos > 0 ? (monto / datos.totalGastos) * 100 : 0
                  return (
                    <div key={categoria} className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#4A3F35] font-medium">{categoria}</span>
                        <span className="text-[#8A7D72]">
                          {formatCOP(monto)} · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#FAF6F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#C4622D] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              {Object.keys(datos.gastosPorCategoria).length === 0 && (
                <p className="text-sm text-[#8A7D72] text-center py-4">Sin gastos registrados este mes</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
