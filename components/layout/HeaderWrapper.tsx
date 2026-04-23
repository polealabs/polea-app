'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

const TITULOS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/docs': 'Documentación',
  '/productos': 'Productos',
  '/entradas': 'Entradas de stock',
  '/ventas': 'Ventas',
  '/clientes': 'Clientes',
  '/documentos': 'Documentos',
  '/documentos/nuevo': 'Nuevo documento',
  '/gastos': 'Gastos',
  '/proveedores': 'Proveedores',
  '/equipo': 'Equipo',
  '/reportes': 'Reportes',
  '/preferencias': 'Preferencias',
  '/perfil': 'Mi tienda',
  '/ayuda': 'Ayuda',
}

export default function HeaderWrapper() {
  const pathname = usePathname()
  const titulo = TITULOS[pathname] ?? 'Polea'
  return <Header titulo={titulo} />
}
