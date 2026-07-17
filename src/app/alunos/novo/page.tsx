import { AppShell } from '@/components/app-shell'
import { AlunoForm } from '../aluno-form'
import { criarAluno } from '../actions'

export default function NovoAlunoPage() {
  return (
    <AppShell titulo="Novo aluno">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <AlunoForm acao={criarAluno} />
        </div>
      </main>
    </AppShell>
  )
}
