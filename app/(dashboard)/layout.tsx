import type { ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import HeaderWrapper from '@/components/layout/HeaderWrapper'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100vh' }}>
      <Sidebar />
      <div className="lg:ml-60 flex flex-col min-h-screen">
        <HeaderWrapper />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
