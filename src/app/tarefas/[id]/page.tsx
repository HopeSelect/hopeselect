import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import type { Tarefa } from '@/lib/tipos'
import { TarefaForm } from '../tarefa-form'
import { atualizarTarefa, excluirTarefa } from '../actions'

export default async function EditarTarefaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await criarClienteServer()

  const [{ data }, { data: alunos }, { data: professores }] = await Promise.all([
    supabase.from('tarefas').select('*').eq('id', id).single(),
    supabase.from('alunos').select('id, nome').order('nome'),
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome'),
  ])

  if (!data) notFound()
  const tarefa = data as Tarefa

  async function remover() {
    'use server'
    await excluirTarefa(id)
    redirect('/tarefas')
  }

  return (
    <AppShell titulo="Editar tarefa">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex items-center justify-end">
          <form action={remover}>
            <button className="text-sm text-red-600 hover:text-red-800">Excluir</button>
          </form>
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <TarefaForm
            acao={atualizarTarefa.bind(null, tarefa.id)}
            alunos={alunos ?? []}
            professores={professores ?? []}
            inicial={tarefa}
          />
        </div>
      </main>
    </AppShell>
  )
}
