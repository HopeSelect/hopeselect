import { Nav } from '@/components/nav'
import { AlunoForm } from '../aluno-form'
import { criarAluno } from '../actions'

export default function NovoAlunoPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Novo aluno</h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <AlunoForm acao={criarAluno} />
        </div>
      </main>
    </>
  )
}
