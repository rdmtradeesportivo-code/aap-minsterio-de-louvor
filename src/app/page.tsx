import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="text-4xl">🎵</span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
        Ministério de Louvor
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600 sm:text-base">
        Repertório, escalas e roteiro de culto em um só lugar para a sua equipe.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}
