import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Páginas de autenticación: transaccionales, no se indexan.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
