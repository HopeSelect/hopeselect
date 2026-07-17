import Link from 'next/link'
import { sair } from '@/lib/acoes-auth'

// Cabeçalho das telas internas. A tela de login não usa este componente.
export function Nav() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
        <Link href="/" className="font-semibold text-gray-900">
          Hope Select
        </Link>
        <Link href="/professores" className="text-gray-600 hover:text-gray-900">
          Professores
        </Link>
        <Link href="/alunos" className="text-gray-600 hover:text-gray-900">
          Alunos
        </Link>
        <Link href="/tarefas" className="text-gray-600 hover:text-gray-900">
          Tarefas
        </Link>
        <Link href="/relatorios" className="text-gray-600 hover:text-gray-900">
          Relatórios
        </Link>
        <form action={sair} className="ml-auto">
          <button className="text-gray-500 hover:text-gray-900">Sair</button>
        </form>
      </nav>
    </header>
  )
}
