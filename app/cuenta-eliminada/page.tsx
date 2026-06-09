import Link from 'next/link'
import { LevaLogo } from '@/components/ui/LevaLogo'

export default function CuentaEliminadaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F1EA] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <LevaLogo size={28} />
          <p className="font-serif text-xl font-bold text-[#1E3A2F]">LEVA</p>
        </div>

        <div className="w-16 h-16 rounded-full bg-[#FDEAEA] flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C44040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </div>

        <h1 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-3">
          Tu cuenta fue eliminada
        </h1>
        <p className="text-[#4A463C] text-sm leading-relaxed mb-8">
          Todos tus datos — tienda, productos, ventas, clientes y gastos — fueron borrados permanentemente de Leva. Esta acción no se puede revertir.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/registro"
            className="w-full bg-[#4A90D9] hover:bg-[#5C9FE0] text-white font-semibold py-3 rounded-xl transition text-sm text-center"
          >
            Crear una nueva cuenta
          </Link>
          <Link
            href="/"
            className="w-full border border-[#DCD7CA] hover:bg-[#DCD7CA]/40 text-[#4A463C] font-medium py-3 rounded-xl transition text-sm text-center"
          >
            Volver al inicio
          </Link>
        </div>

        <p className="text-xs text-[#4A463C]/50 mt-8">
          Si crees que esto fue un error, contacta a{' '}
          <a href="mailto:hola@polea.co" className="hover:underline">hola@polea.co</a>
        </p>
      </div>
    </div>
  )
}
