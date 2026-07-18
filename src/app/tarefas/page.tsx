import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { STATUS_TAREFA, TIPOS_TAREFA, formatarDataTarefa } from '@/lib/utils'
import type { LinhaTarefa, StatusTarefa, TarefaComRelacoes } from '@/lib/tipos'
import { TarefaForm } from './tarefa-form'
import { criarTarefa, definirStatusTarefa } from './actions'
import { FiltrosRelatorioTarefas } from './filtros-relatorio'
import { GraficoTarefas } from './grafico-tarefas'
import { ExportarTarefas } from './exportar-tarefas'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}
function diasAtrasISO(dias: number) {
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
}

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ professor?: string; tipo?: string; status?: string; dias?: string; de?: string; ate?: string }>
}) {
  const params = await searchParams
  const usaPeriodoPersonalizado = Boolean(params.de && params.ate)
  const dias = Number(params.dias ?? '7') || 7
  const de = usaPeriodoPersonalizado ? (params.de as string) : diasAtrasISO(dias)
  const ate = usaPeriodoPersonalizado ? (params.ate as string) : hojeISO()

  const supabase = await criarClienteServer()

  const [{ data: tarefas, error }, { data: alunos }, { data: professores }] = await Promise.all([
    supabase
      .from('tarefas')
      .select('*, alunos(id, nome, matricula), professores(id, nome)')
      .neq('status', 'cancelada')
      .order('data')
      .order('created_at'),
    supabase.from('alunos').select('id, nome').order('nome'),
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome'),
  ])

  const lista = (tarefas ?? []) as unknown as TarefaComRelacoes[]

  const porProfessor = new Map<string, TarefaComRelacoes[]>()
  for (const t of lista) {
    const chave = t.professores.nome
    porProfessor.set(chave, [...(porProfessor.get(chave) ?? []), t])
  }

  let consultaRelatorio = supabase
    .from('vw_tarefas_detalhe')
    .select('*')
    .gte('data', de)
    .lte('data', ate)
    .order('data', { ascending: false })

  if (params.professor) consultaRelatorio = consultaRelatorio.eq('professor_id', params.professor)
  if (params.tipo) consultaRelatorio = consultaRelatorio.eq('tipo', params.tipo)
  if (params.status) consultaRelatorio = consultaRelatorio.eq('status', params.status)

  const { data: linhasRelatorio, error: erroRelatorio } = await consultaRelatorio
  const relatorio = (linhasRelatorio ?? []) as LinhaTarefa[]

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="mt-1 text-sm text-gray-500">Prescrição de treino, laudo, momento coach e lanche.</p>

        {error && <p className="mt-2 text-sm text-red-600">Erro ao carregar: {error.message}</p>}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            {lista.length === 0 && <p className="text-sm text-gray-500">Nenhuma tarefa pendente ou concluída.</p>}
            {[...porProfessor.entries()].map(([nomeProfessor, tarefasDoProfessor]) => (
              <div key={nomeProfessor}>
                <h2 className="mb-2 text-sm font-medium text-gray-500">{nomeProfessor}</h2>
                <div className="space-y-2">
                  {tarefasDoProfessor.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_TAREFA[t.status].classe}`}>
                        {STATUS_TAREFA[t.status].rotulo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {t.alunos.nome}
                          {t.alunos.matricula && <span className="ml-1 font-normal text-gray-400">· {t.alunos.matricula}</span>}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {TIPOS_TAREFA[t.tipo]} · {formatarDataTarefa(t.data)}
                          {t.observacao ? ` · ${t.observacao}` : ''}
                        </p>
                      </div>
                      {t.status === 'a_realizar' && (
                        <form action={definirStatusTarefa.bind(null, t.id, 'concluida' satisfies StatusTarefa)}>
                          <button className="text-sm text-gray-600 hover:text-gray-900">Concluir</button>
                        </form>
                      )}
                      <Link href={`/tarefas/${t.id}`} className="text-sm text-gray-400 hover:text-gray-900">
                        Editar
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-gray-900">Nova tarefa</h2>
            <TarefaForm acao={criarTarefa} alunos={alunos ?? []} professores={professores ?? []} />
          </aside>
        </div>

        <section className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-medium text-gray-900">Relatório de tarefas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Filtre por professor, tipo, status e período. Exporte ou veja os gráficos.
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <FiltrosRelatorioTarefas
              professores={professores ?? []}
              professorSelecionado={params.professor ?? ''}
              tipoSelecionado={params.tipo ?? ''}
              statusSelecionado={params.status ?? ''}
              dias={usaPeriodoPersonalizado ? null : dias}
              de={de}
              ate={ate}
            />
            <ExportarTarefas linhas={relatorio} de={de} ate={ate} />
          </div>

          {erroRelatorio && <p className="mt-4 text-sm text-red-600">Erro ao carregar relatório: {erroRelatorio.message}</p>}

          <GraficoTarefas linhas={relatorio} />

          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Matrícula</th>
                  <th className="px-4 py-2">Aluno</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Tarefa</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      Nenhuma tarefa no período com esses filtros.
                    </td>
                  </tr>
                )}
                {relatorio.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-600">{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-2 text-gray-600">{l.aluno_matricula ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-900">{l.aluno_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{TIPOS_TAREFA[l.tipo]}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_TAREFA[l.status].classe}`}>
                        {STATUS_TAREFA[l.status].rotulo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
