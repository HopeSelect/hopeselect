import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import estilos from './tarefas.module.css'
import { criarClienteServer } from '@/lib/supabase/server'
import { STATUS_TAREFA, TIPOS_TAREFA, formatarDataTarefa } from '@/lib/utils'
import type { StatusTarefa, TarefaComRelacoes } from '@/lib/tipos'
import { TarefaForm } from './tarefa-form'
import { criarTarefa, definirStatusTarefa } from './actions'

export default async function TarefasPage() {
  const supabase = await criarClienteServer()

  const [{ data: tarefas, error }, { data: alunos }, { data: professores }] = await Promise.all([
    supabase
      .from('tarefas')
      .select('*, alunos(id, nome), professores(id, nome)')
      .neq('status', 'cancelada')
      .order('data')
      .order('created_at'),
    supabase.from('alunos').select('id, nome').order('nome'),
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome'),
  ])

  const lista = (tarefas ?? []) as unknown as TarefaComRelacoes[]

  // Agrupado por professor: é assim que o líder confere "o que cada um tem pra fazer".
  const porProfessor = new Map<string, TarefaComRelacoes[]>()
  for (const t of lista) {
    const chave = t.professores.nome
    porProfessor.set(chave, [...(porProfessor.get(chave) ?? []), t])
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="mt-1 text-sm text-gray-500">
          Prescrição de treino, laudo e momento coach.
        </p>

        {error && (
          <p className="mt-2 text-sm text-red-600">Erro ao carregar: {error.message}</p>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Lista agrupada por professor */}
          <section className="space-y-6">
            {lista.length === 0 && (
              <p className="text-sm text-gray-500">Nenhuma tarefa pendente ou concluída.</p>
            )}
            {[...porProfessor.entries()].map(([nomeProfessor, tarefasDoProfessor]) => (
              <div key={nomeProfessor}>
                <h2 className="mb-2 text-sm font-medium text-gray-500">{nomeProfessor}</h2>
                <div className="space-y-2">
                  {tarefasDoProfessor.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_TAREFA[t.status].classe}`}
                      >
                        {STATUS_TAREFA[t.status].rotulo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{t.alunos.nome}</p>
                        <p className="truncate text-xs text-gray-500">
                          {TIPOS_TAREFA[t.tipo]} · {formatarDataTarefa(t.data)}
                          {t.observacao ? ` · ${t.observacao}` : ''}
                        </p>
                      </div>
                      {t.status === 'pendente' && (
                        <form
                          action={definirStatusTarefa.bind(null, t.id, 'concluida' satisfies StatusTarefa)}
                        >
                          <button className="text-sm text-gray-600 hover:text-gray-900">
                            Concluir
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/tarefas/${t.id}`}
                        className="text-sm text-gray-400 hover:text-gray-900"
                      >
                        Editar
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Nova tarefa */}
          <aside className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-gray-900">Nova tarefa</h2>
            <TarefaForm
              acao={criarTarefa}
              alunos={alunos ?? []}
              professores={professores ?? []}
            />
          </aside>
        </div>
      </main>
    </AppShell>
  )
}
