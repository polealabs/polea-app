'use client'

import { useEffect, useRef, useState } from 'react'
import DocsSidebar from '@/components/docs/DocsSidebar'
import DocsContent, { type DocsSectionKey } from '@/components/docs/DocsContent'

export default function DashboardDocsPage() {
  const [active, setActive] = useState<DocsSectionKey>('intro')
  const [menuOpen, setMenuOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [active])

  const handleChange = (section: DocsSectionKey) => {
    setActive(section)
    setMenuOpen(false)
  }

  return (
    <div className="h-screen bg-[#FAF6F0]">
      <div className="md:hidden h-14 px-4 bg-[#1E3A2F] text-white flex items-center justify-between border-b border-white/10">
        <p className="font-serif text-lg">Docs Polea</p>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 rounded-md border border-white/20 flex items-center justify-center"
          aria-label="Abrir menú"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMenuOpen(false)}>
          <div
            className="w-60 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <DocsSidebar active={active} onChange={handleChange} />
          </div>
        </div>
      )}

      <div className="hidden md:block fixed left-0 top-0 z-30">
        <DocsSidebar active={active} onChange={handleChange} />
      </div>

      <main
        ref={contentRef}
        className="h-[calc(100vh-56px)] md:h-screen overflow-y-auto md:ml-60"
      >
        <DocsContent active={active} />
      </main>
    </div>
  )
}
