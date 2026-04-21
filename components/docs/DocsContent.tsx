'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Intro from './sections/Intro'
import Usuarios from './sections/Usuarios'
import Features from './sections/Features'
import Precios from './sections/Precios'
import Stack from './sections/Stack'
import BaseDatos from './sections/BaseDatos'
import Seguridad from './sections/Seguridad'
import Diseno from './sections/Diseno'
import QuickStart from './sections/QuickStart'
import CargaCSV from './sections/CargaCSV'
import Roadmap from './sections/Roadmap'

export type DocsSectionKey =
  | 'intro'
  | 'usuarios'
  | 'features'
  | 'precios'
  | 'stack'
  | 'basedatos'
  | 'seguridad'
  | 'diseno'
  | 'quickstart'
  | 'cargacsv'
  | 'roadmap'

interface DocsContentProps {
  active: DocsSectionKey
}

export default function DocsContent({ active }: DocsContentProps) {
  const sections: Record<DocsSectionKey, ReactNode> = {
    intro: <Intro />,
    usuarios: <Usuarios />,
    features: <Features />,
    precios: <Precios />,
    stack: <Stack />,
    basedatos: <BaseDatos />,
    seguridad: <Seguridad />,
    diseno: <Diseno />,
    quickstart: <QuickStart />,
    cargacsv: <CargaCSV />,
    roadmap: <Roadmap />,
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[#8A7D72] hover:text-[#1A1510] transition mb-4"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Volver al dashboard
      </Link>
      {sections[active]}
    </div>
  )
}
