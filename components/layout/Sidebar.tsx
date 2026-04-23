'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTienda } from '@/lib/hooks/useTienda'

const navItems = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/productos', icon: '◫', label: 'Productos' },
  { href: '/entradas', icon: '↓', label: 'Entradas' },
  { href: '/ventas', icon: '↗', label: 'Ventas' },
  { href: '/clientes', icon: '◎', label: 'Clientes' },
  { href: '/gastos', icon: '−', label: 'Gastos' },
  { href: '/proveedores', icon: '◈', label: 'Proveedores' },
  { href: '/reportes', icon: '◈', label: 'Reportes' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { canViewFinanzas, isOwner } = useTienda()
  const [open, setOpen] = useState(false)
  const visibleNavItems = navItems.filter(
    (item) => canViewFinanzas || (item.href !== '/gastos' && item.href !== '/reportes'),
  )

  // Cerrar sidebar al cambiar de ruta en mobile (diferido para evitar setState síncrono en el efecto)
  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), 0)
    return () => window.clearTimeout(id)
  }, [pathname])

  // Cerrar sidebar al hacer clic fuera en mobile
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const toggleBtn = document.getElementById('sidebar-toggle')
      if (toggleBtn?.contains(e.target as Node)) return
      const sidebar = document.getElementById('sidebar')
      if (sidebar && !sidebar.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <>
      {/* Overlay oscuro en mobile cuando sidebar está abierto */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Botón hamburguesa — solo visible en mobile */}
      <button
        id="sidebar-toggle"
        type="button"
        onClick={() => setOpen(v => !v)}
        className="fixed top-3 left-3 z-40 lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-lg"
        style={{ background: 'var(--color-primary-light)' }}
        aria-label="Abrir menú"
      >
        <span className="text-lg">{open ? '✕' : '☰'}</span>
      </button>

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`
          fixed left-0 top-0 h-full w-60 flex flex-col z-30
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        style={{ background: 'var(--color-primary)' }}
      >
        {/* LOGO */}
        <div className="px-7 py-8 border-b border-white/10">
          <span className="font-serif text-[28px] font-bold text-cream tracking-tight block leading-none">
            POLEA
          </span>
          <span className="text-[11px] text-white/40 uppercase tracking-widest mt-1 block">
            Tu tienda, clara
          </span>
        </div>

        {/* NAV */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[2px] text-white/30 px-7 mb-2">
            Módulos
          </p>
          {visibleNavItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-7 py-[11px] text-sm transition-all relative
                  ${active
                    ? 'text-cream bg-white/10 font-medium'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                  }`}
              >
                {active && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm" style={{ background: 'var(--color-accent)' }} />
                )}
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
          {isOwner && (
            <Link
              href="/equipo"
              className={`flex items-center gap-3 px-7 py-[11px] text-sm transition-all relative
                ${
                  pathname === '/equipo'
                    ? 'text-cream bg-white/10 font-medium'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                }`}
            >
              {pathname === '/equipo' && (
                <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm" style={{ background: 'var(--color-accent)' }} />
              )}
              <span className="w-5 text-center text-base">👥</span>
              Equipo
            </Link>
          )}
        </nav>

        {/* BOTTOM */}
        <div className="px-7 py-5 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-serif text-sm text-white font-bold flex-shrink-0"
              style={{ background: 'var(--color-accent)' }}
            >
              P
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-cream font-medium truncate">Mi tienda</p>
              <p className="text-[11px] text-white/40">Plan gratuito</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
