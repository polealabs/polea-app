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
  const { tienda, loading: tiendaLoading, canViewFinanzas } = useTienda()
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 7)
  })
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

  if (!canViewFinanzas) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-[#8A7D72] text-sm">No tienes permisos para ver esta sección.</p>
      </div>
    )
  }

  if (!datos) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <p className="text-sm text-[#8A7D72]">No se pudieron cargar los datos del reporte.</p>
      </div>
    )
  }

  const sinActividad = datos.ventasNetas === 0 && datos.totalGastos === 0 && datos.totalComprasInventario === 0
  const top3Productos = datos.top3Productos ?? []
  const top3Clientes = datos.top3Clientes ?? []
  const totalSalidasInventario = datos.totalComprasMes + datos.totalComprasInventario
  const flujoNetoMes = datos.ventasNetas - totalSalidasInventario - datos.totalGastos

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Reportes</h1>
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
                  <Bombillo texto="Lo que te queda después de restar el CPV (costo de los productos efectivamente vendidos en el mes)." />
                </p>
                <p className={`text-xl sm:text-2xl font-serif ${datos.utilidadBruta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadBruta)}
                </p>
                <div className="h-1 bg-[#1E3A2F] rounded-full mt-3" />
              </div>

              <div className="bg-white rounded-2xl border border-[#EDE5DC] p-4 shadow-sm">
                <p className="text-xs text-[#8A7D72] mb-1 flex items-center">
                  Utilidad operacional
                  <Bombillo texto="Lo que queda después de ventas netas, CPV y todos los gastos operacionales (variables y fijos)." />
                </p>
                <p className={`text-xl sm:text-2xl font-serif ${datos.utilidadOperacional >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadOperacional)}
                </p>
                <div className="h-1 rounded-full mt-3" style={{ background: datos.utilidadOperacional >= 0 ? '#3A7D5A' : '#C44040' }} />
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
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-[#4A3F35]">Comisiones de plataforma</p>
                <p className="text-sm font-semibold text-[#4A3F35]">- {formatCOP(datos.totalComisionesPlataforma)}</p>
              </div>

              <div className="border-t border-[#EDE5DC] my-3" />

              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-bold text-[#1E3A2F]">Ventas netas</p>
                <p className="text-sm font-bold text-[#1E3A2F]">{formatCOP(datos.ventasNetas)}</p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-[#4A3F35] flex items-center">
                    CPV - Costo de productos vendidos
                    <Bombillo texto="Se calcula con los productos vendidos en el mes y el costo unitario de entrada más reciente antes de la venta para productos terminados." />
                  </p>
                  <p className="text-xs text-[#8A7D72]">Costo de los {datos.totalUnidadesVendidas} productos vendidos este mes</p>
                </div>
                <p className="text-sm font-semibold text-[#4A3F35]">- {formatCOP(datos.cpvMes)}</p>
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
                  <Bombillo texto="El margen bruto muestra cuánto queda después del CPV y antes de gastos operacionales." />
                </div>
                <p className={`text-sm font-bold ${datos.utilidadBruta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadBruta)}
                </p>
              </div>

              {datos.gastosPorTipo.variable.total > 0 && (
                <>
                  <div className="flex items-start justify-between py-2">
                    <div>
                      <p className="text-sm text-[#4A3F35] font-medium flex items-center">
                        Gastos variables
                        <Bombillo texto="Gastos que varían con el volumen de ventas: empaques, envíos, comisiones, pasarelas de pago, insumos." />
                      </p>
                      <div className="mt-1 pl-3 space-y-0.5">
                        {datos.gastosPorTipo.variable.items.map((item) => (
                          <div key={item.subcategoria} className="flex justify-between text-xs text-[#8A7D72] gap-3">
                            <span>{item.subcategoria}</span>
                            <span>{formatCOP(item.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#4A3F35]">- {formatCOP(datos.gastosVariables)}</p>
                  </div>
                  <div className="border-t border-[#EDE5DC] my-2" />
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm font-bold" style={{ color: datos.utilidadDespuesVariables >= 0 ? '#3A7D5A' : '#C44040' }}>
                      Utilidad después de variables
                    </p>
                    <p className="text-sm font-bold" style={{ color: datos.utilidadDespuesVariables >= 0 ? '#3A7D5A' : '#C44040' }}>
                      {formatCOP(datos.utilidadDespuesVariables)}
                    </p>
                  </div>
                </>
              )}

              {datos.gastosPorTipo.fijo.total > 0 && (
                <>
                  <div className="flex items-start justify-between py-2">
                    <div>
                      <p className="text-sm text-[#4A3F35] font-medium flex items-center">
                        Gastos fijos
                        <Bombillo texto="Gastos que no cambian con las ventas: arriendo, nómina, suscripciones, publicidad fija." />
                      </p>
                      <div className="mt-1 pl-3 space-y-0.5">
                        {datos.gastosPorTipo.fijo.items.map((item) => (
                          <div key={item.subcategoria} className="flex justify-between text-xs text-[#8A7D72] gap-3">
                            <span>{item.subcategoria}</span>
                            <span>{formatCOP(item.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#4A3F35]">- {formatCOP(datos.gastosFijos)}</p>
                  </div>
                  <div className="border-t border-[#EDE5DC] my-2" />
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm font-bold" style={{ color: datos.utilidadOperacional >= 0 ? '#3A7D5A' : '#C44040' }}>
                      Utilidad operacional
                    </p>
                    <p className="text-sm font-bold" style={{ color: datos.utilidadOperacional >= 0 ? '#3A7D5A' : '#C44040' }}>
                      {formatCOP(datos.utilidadOperacional)}
                    </p>
                  </div>
                </>
              )}

              {datos.gastosPorTipo.financiero.total > 0 && (
                <>
                  <div className="flex items-start justify-between py-2">
                    <div>
                      <p className="text-sm text-[#4A3F35] font-medium flex items-center">
                        Gastos financieros
                        <Bombillo texto="Intereses y cuotas de créditos o préstamos." />
                      </p>
                      <div className="mt-1 pl-3 space-y-0.5">
                        {datos.gastosPorTipo.financiero.items.map((item) => (
                          <div key={item.subcategoria} className="flex justify-between text-xs text-[#8A7D72] gap-3">
                            <span>{item.subcategoria}</span>
                            <span>{formatCOP(item.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#4A3F35]">- {formatCOP(datos.gastosFinancieros)}</p>
                  </div>
                </>
              )}

              {datos.gastosPorTipo.sin_clasificar.total > 0 && (
                <div className="flex items-start justify-between py-2">
                  <div>
                    <p className="text-sm text-[#8A7D72] flex items-center">
                      Otros gastos
                      <Bombillo texto="Gastos registrados antes de la categorización. Te recomendamos reclasificarlos en el módulo de Gastos." />
                    </p>
                    <div className="mt-1 pl-3 space-y-0.5">
                      {datos.gastosPorTipo.sin_clasificar.items.map((item, idx) => (
                        <div key={`${item.categoria}-${idx}`} className="flex justify-between text-xs text-[#8A7D72] gap-3">
                          <span>{item.categoria}</span>
                          <span>{formatCOP(item.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#8A7D72]">
                    - {formatCOP(datos.gastosPorTipo.sin_clasificar.total)}
                  </p>
                </div>
              )}

              <div className="border-t-2 border-[#EDE5DC] my-3" />

              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-bold" style={{ color: datos.utilidadNeta >= 0 ? '#3A7D5A' : '#C44040' }}>
                  Utilidad antes de impuestos
                </p>
                <p className="text-sm font-bold" style={{ color: datos.utilidadNeta >= 0 ? '#3A7D5A' : '#C44040' }}>
                  {formatCOP(datos.utilidadNeta)}
                </p>
              </div>

              <div className="flex items-center justify-between py-1 opacity-50">
                <p className="text-xs text-[#8A7D72] italic">Impuestos (no calculado)</p>
                <p className="text-xs text-[#8A7D72]">—</p>
              </div>

              <div className="border-t border-[#EDE5DC] my-2" />

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <p className={`text-lg font-bold ${datos.utilidadNeta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                    Utilidad neta
                  </p>
                  <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-[#F2F0EC] text-[#5A4F45]">
                    {datos.margenNeto.toFixed(1)}% margen
                  </span>
                  <Bombillo texto="Resultado final. En este momento no incluye impuestos — agrega un contador para calcularlos." />
                </div>
                <p className={`text-lg font-bold ${datos.utilidadNeta >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                  {formatCOP(datos.utilidadNeta)}
                </p>
              </div>

              <div className="bg-[#FAF6F0] rounded-xl p-4 border border-[#EDE5DC] mt-4">
                <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-1">📦 Compras al proveedor este mes</p>
                <p className="font-serif text-lg font-medium text-[#1A1510]">{formatCOP(datos.totalComprasMes)}</p>
                <p className="text-xs text-[#8A7D72] mt-1">
                  Estas compras entran al inventario como activo, no como gasto. Solo se convierten en costo cuando el producto se vende (CPV).
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm p-6 mt-6 mb-6">
              <p className="text-sm font-semibold text-[#1A1510] mb-5 flex items-center flex-wrap gap-1">
                💵 Flujo de caja del mes
                <Bombillo texto="Muestra el movimiento real del dinero. A diferencia del P&L, aquí aparecen las compras al proveedor aunque no hayas vendido esa mercancía aún." />
              </p>

              <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-2">Entradas</p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-soft)' }}>Cobros por ventas del mes</span>
                  <span className="font-semibold text-[#3A7D5A]">+ {formatCOP(datos.ventasNetas)}</span>
                </div>
              </div>

              <div className="border-t border-[#EDE5DC] my-3" />

              <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-2">Salidas operativas</p>
              <div className="space-y-2 mb-4">
                {datos.totalComprasMes > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-soft)' }}>Compras a proveedores (entradas)</span>
                    <span className="font-semibold text-[#C44040]">- {formatCOP(datos.totalComprasMes)}</span>
                  </div>
                )}
                {datos.totalComprasInventario > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-soft)' }}>Compras de inventario</span>
                    <span className="font-semibold text-[#C44040]">- {formatCOP(datos.totalComprasInventario)}</span>
                  </div>
                )}
                {datos.gastosVariables > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-soft)' }}>Gastos variables</span>
                    <span className="font-semibold text-[#C44040]">- {formatCOP(datos.gastosVariables)}</span>
                  </div>
                )}
                {datos.gastosFijos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-soft)' }}>Gastos fijos</span>
                    <span className="font-semibold text-[#C44040]">- {formatCOP(datos.gastosFijos)}</span>
                  </div>
                )}
                {datos.gastosPorTipo.sin_clasificar.total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-soft)' }}>Otros gastos</span>
                    <span className="font-semibold text-[#C44040]">
                      - {formatCOP(datos.gastosPorTipo.sin_clasificar.total)}
                    </span>
                  </div>
                )}
              </div>

              {datos.gastosFinancieros > 0 && (
                <>
                  <div className="border-t border-[#EDE5DC] my-3" />
                  <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-2">Salidas financieras</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--color-text-soft)' }}>Gastos financieros</span>
                      <span className="font-semibold text-[#C44040]">- {formatCOP(datos.gastosFinancieros)}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t-2 border-[#EDE5DC] pt-3 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    Flujo neto del mes
                  </span>
                  <span className={`font-bold font-serif text-lg ${flujoNetoMes >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'}`}>
                    {formatCOP(flujoNetoMes)}
                  </span>
                </div>
                <p className="text-xs text-[#8A7D72] mt-1">
                  {flujoNetoMes >= 0
                    ? '✓ Más dinero entró del que salió este mes'
                    : '⚠ Salió más dinero del que entró — revisa compras y gastos'}
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
                  <div>
                    <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-3">⭐ Top 3 Productos</p>
                    {top3Productos.length > 0 ? (
                      top3Productos.map((prod, i) => (
                        <div key={`${prod.nombre}-${i}`} className="flex items-center justify-between py-2 border-b border-[#EDE5DC] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-sm text-[#8A7D72]">#{i + 1}</span>
                            <span className="text-sm font-medium text-[#1A1510]">{prod.nombre}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#1E3A2F]">{formatCOP(prod.total)}</p>
                            <p className="text-xs text-[#8A7D72]">{prod.unidades} uds</p>
                            {prod.margen !== undefined && (
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: prod.margen >= 0 ? '#3A7D5A' : '#C44040' }}
                              >
                                {prod.margen.toFixed(0)}% margen
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#8A7D72] mt-2">Sin datos suficientes</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-3">👥 Top 3 Clientes</p>
                    {top3Clientes.length > 0 ? (
                      top3Clientes.map((cliente, i) => (
                        <div key={`${cliente.nombre}-${i}`} className="flex items-center justify-between py-2 border-b border-[#EDE5DC] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-sm text-[#8A7D72]">#{i + 1}</span>
                            <span className="text-sm font-medium text-[#1A1510]">{cliente.nombre}</span>
                          </div>
                          <p className="text-sm font-semibold text-[#1E3A2F]">{formatCOP(cliente.total)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#8A7D72] mt-2">Sin clientes registrados</p>
                    )}
                  </div>
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
