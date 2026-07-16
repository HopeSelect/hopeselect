import Link from 'next/link'
import { Nav } from '@/components/nav'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Início</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastros do sistema. O painel de sala vem a seguir.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/professores"
            className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-400"
          >
            <h2 className="font-medium text-gray-900">Professores</h2>
            <p className="mt-1 text-sm text-gray-500">
              Cadastro, foto, função e horário.
            </p>
          </Link>
          <Link
            href="/alunos"
            className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-400"
          >
            <h2 className="font-medium text-gray-900">Alunos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Classificação, restrições e alertas.
            </p>
          </Link>
        </div>
      </main>
    </>
  )
}
