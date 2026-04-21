'use client'

import type { DocsSectionKey } from './DocsContent'

interface DocsSidebarProps {
  active: DocsSectionKey
  onChange: (section: DocsSectionKey) => void
}

type Item = { key: DocsSectionKey; label: string }

const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Producto',
    items: [
      { key: 'intro', label: '¿Qué es Polea?' },
      { key: 'usuarios', label: 'Usuarios objetivo' },
      { key: 'features', label: 'Módulos' },
      { key: 'precios', label: 'Precios' },
    ],
  },
  {
    title: 'Técnico',
    items: [
      { key: 'stack', label: 'Stack' },
      { key: 'basedatos', label: 'Base de datos' },
      { key: 'seguridad', label: 'Seguridad (RLS)' },
      { key: 'diseno', label: 'Diseño' },
    ],
  },
  {
    title: 'Guía',
    items: [
      { key: 'quickstart', label: 'Quickstart' },
      { key: 'cargacsv', label: 'Carga CSV' },
      { key: 'roadmap', label: 'Roadmap' },
    ],
  },
]

export default function DocsSidebar({ active, onChange }: DocsSidebarProps) {
  return (
    <aside className="w-60 min-h-screen bg-[#2D4A3E] flex flex-col">
      <div className="px-7 py-8 border-b border-white/10">
        <span className="font-serif text-[28px] font-bold text-[#FAF6F0] tracking-tight block leading-none">
          POLEA
        </span>
        <span className="text-[11px] text-white/40 uppercase tracking-widest mt-1 block">
          Documentación interna
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-5">
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="text-[10px] uppercase tracking-[2px] text-white/30 px-7 mb-2">{group.title}</p>
            {group.items.map((item) => {
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => onChange(item.key)}
                  className={`w-full text-left px-7 py-[11px] text-sm transition relative ${
                    isActive
                      ? 'bg-[#C4622D] text-white font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
