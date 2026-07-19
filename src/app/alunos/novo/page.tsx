import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { AlunoForm } from '../aluno-form'
import { criarAluno } from '../actions'

export default async function NovoAlunoPage() {
  const supabase = await criarClienteServer()
  const { data: professores } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  return (
    <AppShell titulo="Novo aluno">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <AlunoForm acao={criarAluno} professores={professores ?? []} />
        </div>
      </main>
    </AppShell>
  )
}
