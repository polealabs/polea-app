import type { ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import HeaderWrapper from '@/components/layout/HeaderWrapper'
import InactivityGuard from '@/components/ui/InactivityGuard'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100vh' }}>
      <InactivityGuard />
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
