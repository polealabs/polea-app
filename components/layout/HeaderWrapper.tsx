'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

const TITULOS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/docs': 'Documentación',
  '/productos': 'Inventario',
  '/entradas': 'Entradas de stock',
  '/ventas': 'Ventas',
  '/pos': 'Modo POS',
  '/clientes': 'Clientes',
  '/consignaciones': 'Tiendas Aliadas',
  '/consignaciones/salida': 'Remisión de salida',
  '/documentos': 'Documentos',
  '/documentos/nuevo': 'Nuevo documento',
  '/gastos': 'Gastos',
  '/proveedores': 'Proveedores',
  '/equipo': 'Equipo',
  '/reportes': 'Reportes',
  '/preferencias': 'Preferencias',
  '/configuracion/medios-pago': 'Medios de pago',
  '/perfil': 'Mi tienda',
  '/ayuda': 'Ayuda',
}

export default function HeaderWrapper() {
  const pathname = usePathname()
  if (pathname.includes('/variantes')) {
    return <Header titulo="Variantes del producto" />
  }
  const titulo =
    TITULOS[pathname] ??
    Object.entries(TITULOS).find(([base]) => pathname.startsWith(base))?.[1] ??
    'Polea'
  return <Header titulo={titulo} />
}
