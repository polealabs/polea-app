'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import type { Documento, ItemDocumento, TipoDocumento } from '@/lib/types'
import { actualizarEstado, eliminarDocumento } from './actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import ConfirmModal from '@/components/ui/ConfirmModal'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO')
}

function parseItems(raw: unknown): ItemDocumento[] {
  if (Array.isArray(raw)) return raw as ItemDocumento[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ItemDocumento[]) : []
    } catch {
      return []
    }
  }
  return []
}

const ESTADO_STYLES: Record<string, string> = {
  borrador: 'bg-[#FAF6F0] text-[#8A7D72]',
  enviado: 'bg-[#EFF6FF] text-[#3B82F6]',
  aceptado: 'bg-[#E8F5EE] text-[#3A7D5A]',
  rechazado: 'bg-[#FDEAEA] text-[#C44040]',
  pagado: 'text-white',
}

export default function DocumentosPage() {
  const router = useRouter()
  const { tienda, loading: tiendaLoading } = useTienda()
  const { toasts, showToast, removeToast } = useToast()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TipoDocumento>('cotizacion')
  const [busqueda, setBusqueda] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!tienda) return
    const id = window.setTimeout(() => {
      const supabase = createClient()
      void supabase
        .from('documentos')
        .select('*')
        .eq('tienda_id', tienda.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            showToast(error.message, 'error')
            setLoading(false)
            return
          }
          const docs = (data ?? []).map((d) => ({
            ...(d as Omit<Documento, 'items'>),
            items: parseItems((d as { items?: unknown }).items),
          }))
          setDocumentos(docs as Documento[])
          setLoading(false)
        })
    }, 0)
    return () => window.clearTimeout(id)
  }, [tienda, showToast])

  const documentosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return documentos
      .filter((d) => d.tipo === tab)
      .filter((d) => {
        if (!q) return true
        return d.numero.toLowerCase().includes(q) || d.destinatario_nombre.toLowerCase().includes(q)
      })
  }, [documentos, tab, busqueda])

  async function handleDelete() {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmDelete(null)
    const res = await eliminarDocumento(id)
    if (res?.error) {
      showToast(res.error, 'error')
      return
    }
    setDocumentos((prev) => prev.filter((d) => d.id !== id))
    showToast('Documento eliminado')
  }

  async function onChangeEstado(id: string, estado: Documento['estado']) {
    const res = await actualizarEstado(id, estado)
    if (res?.error) {
      showToast(res.error, 'error')
      return
    }
    setDocumentos((prev) => prev.map((d) => (d.id === id ? { ...d, estado } : d)))
    showToast('Estado actualizado')
    router.refresh()
  }

  if (tiendaLoading || loading) {
    return <div className="p-4 md:p-6">Cargando documentos...</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <ConfirmModal
        open={confirmDelete !== null}
        title="Eliminar documento"
        message="¿Seguro que deseas eliminar este documento?"
        confirmLabel="Eliminar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
        danger
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Documentos</h1>
          <p className="text-sm text-ink-soft mt-0.5">Gestiona cotizaciones y cuentas de cobro</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/documentos/nuevo?tipo=cotizacion"
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] transition"
          >
            Nueva cotización
          </Link>
          <Link href="/documentos/nuevo?tipo=cuenta_cobro" className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg">
            Nueva cuenta de cobro
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { id: 'cotizacion' as const, label: 'Cotizaciones' },
          { id: 'cuenta_cobro' as const, label: 'Cuentas de cobro' },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-sm font-medium px-4 py-2 rounded-full border transition ${
              tab === t.id ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-pale)]' : 'border-[#EDE5DC] text-ink-soft bg-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número o destinatario"
          className="w-full md:max-w-sm px-3 py-2 rounded-lg border border-[#EDE5DC] bg-white text-sm"
        />
      </div>

      {documentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-12 text-center shadow-sm">
          <p className="text-sm text-ink-soft">
            {tab === 'cotizacion' ? 'No hay cotizaciones registradas.' : 'No hay cuentas de cobro registradas.'}
          </p>
          <Link
            href={`/documentos/nuevo?tipo=${tab}`}
            className="inline-block mt-3 text-sm text-[var(--color-accent)] hover:underline"
          >
            Crear {tab === 'cotizacion' ? 'cotización' : 'cuenta de cobro'}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Número</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Destinatario</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Estado</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentosFiltrados.map((d) => (
                <tr key={d.id} className="border-b border-[#EDE5DC]/70 hover:bg-[#FAF6F0]/50">
                  <td className="px-5 py-4 font-semibold text-ink">{d.numero}</td>
                  <td className="px-5 py-4 text-ink">{d.destinatario_nombre}</td>
                  <td className="px-5 py-4 text-right font-semibold text-ink">{formatCOP(d.total)}</td>
                  <td className="px-5 py-4 text-ink-soft">{formatFecha(d.fecha)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_STYLES[d.estado] ?? ESTADO_STYLES.borrador}`}
                        style={d.estado === 'pagado' ? { background: 'var(--color-primary)' } : undefined}
                      >
                        {d.estado}
                      </span>
                      <select
                        value={d.estado}
                        onChange={(e) => void onChangeEstado(d.id, e.target.value as Documento['estado'])}
                        className="text-xs border border-[#EDE5DC] rounded-md px-2 py-1 bg-white"
                      >
                        <option value="borrador">borrador</option>
                        <option value="enviado">enviado</option>
                        <option value="aceptado">aceptado</option>
                        <option value="rechazado">rechazado</option>
                        <option value="pagado">pagado</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-3 text-xs">
                      <Link href={`/documentos/${d.id}/pdf`} className="text-[var(--color-accent)] hover:underline">
                        Ver PDF
                      </Link>
                      <button type="button" onClick={() => setConfirmDelete(d.id)} className="text-red-500 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
