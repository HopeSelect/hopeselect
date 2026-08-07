import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { STATUS_TAREFA, TIPOS_TAREFA, formatarDataTarefa, hojeISO, dataDeslocadaISO } from '@/lib/utils'
import type { LinhaTarefa, StatusTarefa, TarefaComRelacoes } from '@/lib/tipos'
import { TarefaForm } from './tarefa-form'
import { criarTarefa, definirStatusTarefa } from './actions'
import { FiltrosRelatorioTarefas } from './filtros-relatorio'
import { GraficoTarefas } from './grafico-tarefas'
import { ExportarTarefas } from './exportar-tarefas'

const POR_PAGINA = 15

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{
    professor?: string
    tipo?: string
    status?: string
    dias?: string
    de?: string
    ate?: string
    pagina?: string
    paginaRelatorio?: string
  }>
}) {
  const supabase = await criarClienteServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AppShell titulo="Tarefas">
        <p className="text-sm text-gray-500 dark:text-gray-400">Sessão expirada.</p>
      </AppShell>
    )
  }

  const { data: meuPerfil } = await supabase.from('perfis').select('papel').eq('id', user.id).single()

  if (meuPerfil?.papel !== 'admin' && meuPerfil?.papel !== 'lider') {
    return (
      <AppShell titulo="Tarefas">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Essa área é restrita a líderes e administradores. Fala com um líder se precisar de acesso.
        </p>
      </AppShell>
    )
  }

  const params = await searchParams
  const usaPeriodoPersonalizado = Boolean(params.de && params.ate)
  const dias = Number(params.dias ?? '7') || 7
  const de = usaPeriodoPersonalizado ? (params.de as string) : dataDeslocadaISO(-dias)
  const ate = usaPeriodoPersonalizado ? (params.ate as string) : hojeISO()

  const [{ data: tarefas, error }, { data: alunos }, { data: professores }] = await Promise.all([
    supabase
      .from('tarefas')
      .select('*, alunos(id, nome, matricula), professores(id, nome)')
      .eq('status', 'a_realizar')
      .order('data')
      .order('created_at'),
    supabase.from('alunos').select('id, nome').order('nome'),
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome'),
  ])

  const lista = (tarefas ?? []) as unknown as TarefaComRelacoes[]

  const pagina = Math.max(1, Number(params.pagina ?? '1') || 1)
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const listaDaPagina = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const porProfessor = new Map<string, TarefaComRelacoes[]>()
  for (const t of listaDaPagina) {
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

  const paginaRelatorio = Math.max(1, Number(params.paginaRelatorio ?? '1') || 1)
  const totalPaginasRelatorio = Math.max(1, Math.ceil(relatorio.length / POR_PAGINA))
  const relatorioDaPagina = relatorio.slice((paginaRelatorio - 1) * POR_PAGINA, paginaRelatorio * POR_PAGINA)
  function linkPaginaRelatorio(p: number) {
    const sp = new URLSearchParams()
    if (params.professor) sp.set('professor', params.professor)
    if (params.tipo) sp.set('tipo', params.tipo)
    if (params.status) sp.set('status', params.status)
    if (usaPeriodoPersonalizado) {
      sp.set('de', de)
      sp.set('ate', ate)
    } else if (params.dias) {
      sp.set('dias', params.dias)
    }
    if (params.pagina) sp.set('pagina', params.pagina)
    sp.set('paginaRelatorio', String(p))
    return `/tarefas?${sp.toString()}`
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Prescrição de treino, laudo, momento coach e lanche.</p>

        {error && <p className="mt-2 text-sm text-red-600">Erro ao carregar: {error.message}</p>}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              A realizar <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({lista.length} no total)</span>
            </h2>
            {lista.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma tarefa a realizar no momento.</p>}
            {[...porProfessor.entries()].map(([nomeProfessor, tarefasDoProfessor]) => (
              <div key={nomeProfessor}>
                <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">{nomeProfessor}</h3>
                <div className="space-y-2">
                  {tarefasDoProfessor.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_TAREFA[t.status].classe}`}>
                        {STATUS_TAREFA[t.status].rotulo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                          {t.alunos.nome}
                          {t.alunos.matricula && <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">· {t.alunos.matricula}</span>}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {TIPOS_TAREFA[t.tipo]} · {formatarDataTarefa(t.data)}
                          {t.observacao ? ` · ${t.observacao}` : ''}
                        </p>
                      </div>
                      <form action={definirStatusTarefa.bind(null, t.id, 'concluida' satisfies StatusTarefa)}>
                        <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Concluir</button>
                      </form>
                      <Link href={`/tarefas/${t.id}`} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
                        Editar
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href={`/tarefas?pagina=${pagina - 1}`}
                  aria-disabled={pagina <= 1}
                  className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                    pagina <= 1 ? 'pointer-events-none text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  Anterior
                </Link>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Página {pagina} de {totalPaginas}
                </span>
                <Link
                  href={`/tarefas?pagina=${pagina + 1}`}
                  aria-disabled={pagina >= totalPaginas}
                  className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                    pagina >= totalPaginas ? 'pointer-events-none text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  Próxima
                </Link>
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 className="mb-4 font-medium text-gray-900 dark:text-gray-100">Nova tarefa</h2>
            <TarefaForm acao={criarTarefa} alunos={alunos ?? []} professores={professores ?? []} />
          </aside>
        </div>

        <section className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Relatório de tarefas <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({relatorio.length} no total)</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Filtre por professor, tipo, status e período. Aqui aparece tudo — inclusive concluídas, agendadas e a repetir.
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

          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
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
                {relatorioDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhuma tarefa no período com esses filtros.
                    </td>
                  </tr>
                )}
                {relatorioDaPagina.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.aluno_matricula ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{l.aluno_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{TIPOS_TAREFA[l.tipo]}</td>
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

          {totalPaginasRelatorio > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href={linkPaginaRelatorio(paginaRelatorio - 1)}
                aria-disabled={paginaRelatorio <= 1}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaRelatorio <= 1 ? 'pointer-events-none text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Anterior
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Página {paginaRelatorio} de {totalPaginasRelatorio}
              </span>
              <Link
                href={linkPaginaRelatorio(paginaRelatorio + 1)}
                aria-disabled={paginaRelatorio >= totalPaginasRelatorio}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaRelatorio >= totalPaginasRelatorio
                    ? 'pointer-events-none text-gray-300 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Próxima
              </Link>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  )
}
