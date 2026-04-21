import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <section className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-terra-pale text-center">
        <h1 className="text-3xl font-bold text-forest">POLEA</h1>
        <p className="mt-3 text-ink/80">
          Administra tu tienda en un solo lugar.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-lg bg-terra px-4 py-2.5 font-semibold text-white hover:bg-terra-light transition-colors"
          >
            Iniciar sesion
          </Link>
          <Link
            href="/registro"
            className="w-full rounded-lg border border-terra px-4 py-2.5 font-semibold text-terra hover:bg-terra-pale transition-colors"
          >
            Crear cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
