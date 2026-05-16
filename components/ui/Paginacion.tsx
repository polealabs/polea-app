'use client'

type Props = {
  total: number
  porPagina: number
  pagina: number
  onChange: (p: number) => void
}

export function Paginacion({ total, porPagina, pagina, onChange }: Props) {
  const totalPaginas = Math.ceil(total / porPagina)
  if (totalPaginas <= 1) return null

  const inicio = (pagina - 1) * porPagina + 1
  const fin = Math.min(pagina * porPagina, total)

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-t"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
        {inicio}–{fin} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(pagina - 1)}
          disabled={pagina <= 1}
          className="text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-40"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)' }}
        >
          ← Anterior
        </button>
        <span
          className="text-xs font-medium min-w-[56px] text-center"
          style={{ color: 'var(--color-text-soft)' }}
        >
          {pagina} / {totalPaginas}
        </span>
        <button
          type="button"
          onClick={() => onChange(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-40"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)' }}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
