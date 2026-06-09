import Link from 'next/link'

export default function CuentaEliminadaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#1E3A2F" />
            <circle cx="16" cy="14" r="9" fill="none" stroke="#FAF6F0" strokeWidth="2.5" />
            <circle cx="16" cy="14" r="4" fill="none" stroke="#FAF6F0" strokeWidth="2" />
            <circle cx="16" cy="14" r="1.5" fill="#C4622D" />
            <line x1="16" y1="23" x2="16" y2="29" stroke="#C4622D" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
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
        <p className="text-[#8A7D72] text-sm leading-relaxed mb-8">
          Todos tus datos — tienda, productos, ventas, clientes y gastos — fueron borrados permanentemente de Leva. Esta acción no se puede revertir.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/registro"
            className="w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-3 rounded-xl transition text-sm text-center"
          >
            Crear una nueva cuenta
          </Link>
          <Link
            href="/"
            className="w-full border border-[#EDE5DC] hover:bg-[#EDE5DC]/40 text-[#4A3F35] font-medium py-3 rounded-xl transition text-sm text-center"
          >
            Volver al inicio
          </Link>
        </div>

        <p className="text-xs text-[#8A7D72]/50 mt-8">
          Si crees que esto fue un error, contacta a{' '}
          <a href="mailto:hola@polea.co" className="hover:underline">hola@polea.co</a>
        </p>
      </div>
    </div>
  )
}
