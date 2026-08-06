import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { CLASSIFICACOES, TIPOS_TAREFA, statusPlano, hojeISO, dataDeslocadaISO } from '@/lib/utils'
import { calcularOcupacaoProfessor } from '@/lib/ocupacao'
import { calcularProporcaoPorPeriodo, NOMES_PERIODO, PROPORCAO_IDEAL } from '@/lib/periodos'
import type {
  Classificacao,
  HorarioProfessor,
  LinhaAtendimento,
  LinhaAtendimentosPorProfessor,
  LinhaProdutividade,
  LinhaTarefasPorProfessor,
  TipoTarefa,
} from '@/lib/tipos'
import { FiltrosAtendimentos } from './filtros-atendimentos'
import { GraficoAtendimentos } from './grafico-atendimentos'
import { ExportarBotoes } from './exportar-botoes'

// Linha de aluno pra seção "Alunos matriculados" (lista completa, sem
// filtro de período — é o cadastro geral, não uma atividade no tempo).
export interface LinhaAlunoRelatorio {
  matricula: string | null
  nome: string
  classificacao: Classificacao
  telefone: string | null
  email: string | null
  data_matricula: string | null
  vencimento_plano: string | null
  professores: { nome: string } | null
}

// Junta atendimentos + tarefas concluídas por professor/dia. As duas fontes já
// vêm agregadas do banco (vw_atendimentos_por_professor e
// vw_tarefas_por_professor_dia) — aqui é só um merge por chave, não agregação.
function combinarProdutividade(
  atendimentos: LinhaAtendimentosPorProfessor[],
  tarefas: LinhaTarefasPorProfessor[],
): LinhaProdutividade[] {
  const mapa = new Map<string, LinhaProdutividade>()

  for (const a of atendimentos) {
    const chave = `${a.professor_id}-${a.data}`
    mapa.set(chave, {
      data: a.data,
      professor_id: a.professor_id,
      professor_nome: a.professor_nome,
      total_atendimentos: a.total_atendimentos,
      total_tarefas_concluidas: 0,
    })
  }
  for (const t of tarefas) {
    const chave = `${t.professor_id}-${t.data}`
    const existente = mapa.get(chave)
    if (existente) {
      existente.total_tarefas_concluidas = t.total_concluidas
    } else {
      mapa.set(chave, {
        data: t.data,
        professor_id: t.professor_id,
        professor_nome: t.professor_nome,
        total_atendimentos: 0,
        total_tarefas_concluidas: t.total_concluidas,
      })
    }
  }

  return [...mapa.values()]
    .filter((l) => l.total_atendimentos > 0 || l.total_tarefas_concluidas > 0)
    .sort((a, b) => (a.data === b.data ? a.professor_nome.localeCompare(b.professor_nome) : a.data < b.data ? 1 : -1))
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string; professor?: string; tipo?: string; dias?: string; de?: string; ate?: string }>
}) {
  const params = await searchParams
  const usaPeriodoPersonalizado = Boolean(params.de && params.ate)
  const dias = Number(params.dias ?? '7') || 7
  const de = usaPeriodoPersonalizado ? (params.de as string) : dataDeslocadaISO(-dias)
  const ate = usaPeriodoPersonalizado ? (params.ate as string) : hojeISO()

  const supabase = await criarClienteServer()

  let consultaAtendimentos = supabase
    .from('vw_atendimentos')
    .select('*')
    .gte('data', de)
    .lte('data', ate)
    .order('data', { ascending: false })
    .order('inicio', { ascending: false })

  if (params.aluno) consultaAtendimentos = consultaAtendimentos.ilike('aluno_nome', `%${params.aluno}%`)
  if (params.professor) consultaAtendimentos = consultaAtendimentos.eq('professor_id', params.professor)
  if (params.tipo) consultaAtendimentos = consultaAtendimentos.eq('tarefa', params.tipo)

  let consultaAtPorProf = supabase
    .from('vw_atendimentos_por_professor')
    .select('*')
    .gte('data', de)
    .lte('data', ate)
  if (params.professor) consultaAtPorProf = consultaAtPorProf.eq('professor_id', params.professor)

  let consultaTarefas = supabase.from('vw_tarefas_por_professor_dia').select('*').gte('data', de).lte('data', ate)
  if (params.professor) consultaTarefas = consultaTarefas.eq('professor_id', params.professor)

  let consultaTarefasConcluidas = supabase
    .from('tarefas')
    .select('tipo')
    .eq('status', 'concluida')
    .gte('data', de)
    .lte('data', ate)
  if (params.professor) consultaTarefasConcluidas = consultaTarefasConcluidas.eq('professor_id', params.professor)

  const [
    { data: atendimentos, error: erroAtendimentos },
    { data: atendimentosPorProfessor, error: erroAtPorProf },
    { data: tarefasPorProfessor, error: erroTarefas },
    { data: professores },
    { data: todosAlunos, error: erroAlunos },
    { data: horariosProfessores, error: erroHorarios },
    { data: tarefasComTempo, error: erroTarefasComTempo },
    { data: tarefasConcluidas, error: erroTarefasConcluidas },
  ] = await Promise.all([
    consultaAtendimentos,
    consultaAtPorProf,
    consultaTarefas,
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome'),
    supabase
      .from('alunos')
      .select('matricula, nome, classificacao, telefone, email, data_matricula, vencimento_plano, professores(nome)')
      .order('nome'),
    supabase.from('professor_horarios').select('*'),
    supabase
      .from('tarefas')
      .select('professor_id, inicio, fim')
      .gte('data', de)
      .lte('data', ate)
      .not('inicio', 'is', null)
      .not('fim', 'is', null),
    consultaTarefasConcluidas,
  ])

  const erro =
    erroAtendimentos?.message ??
    erroAtPorProf?.message ??
    erroTarefas?.message ??
    erroAlunos?.message ??
    erroHorarios?.message ??
    erroTarefasComTempo?.message ??
    erroTarefasConcluidas?.message ??
    null

  const linhasAtendimentos = (atendimentos ?? []) as LinhaAtendimento[]
  const linhasProdutividade = combinarProdutividade(
    (atendimentosPorProfessor ?? []) as LinhaAtendimentosPorProfessor[],
    (tarefasPorProfessor ?? []) as LinhaTarefasPorProfessor[],
  )
  const linhasAlunos = (todosAlunos ?? []) as unknown as LinhaAlunoRelatorio[]
  const linhasOcupacao = calcularOcupacaoProfessor(
    professores ?? [],
    (horariosProfessores ?? []) as HorarioProfessor[],
    linhasAtendimentos.map((l) => ({ professor_id: l.professor_id, duracao_min: l.duracao_min })),
    (tarefasComTempo ?? []) as { professor_id: string; inicio: string; fim: string }[],
    de,
    ate,
  )
  const numeroDeDias = Math.round((new Date(`${ate}T00:00:00`).getTime() - new Date(`${de}T00:00:00`).getTime()) / 86400000) + 1
  const linhasProporcao = calcularProporcaoPorPeriodo(
    linhasAtendimentos.map((l) => ({ inicio: l.inicio })),
    (horariosProfessores ?? []) as HorarioProfessor[],
    numeroDeDias,
  )

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="mt-1 text-sm text-gray-500">
          Acessos dos alunos: quantas vezes vieram, duração de treino, com quais professores treinaram e quais tarefas foram realizadas.
        </p>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <FiltrosAtendimentos
            professores={professores ?? []}
            aluno={params.aluno ?? ''}
            professorSelecionado={params.professor ?? ''}
            tipoSelecionado={params.tipo ?? ''}
            dias={usaPeriodoPersonalizado ? null : dias}
            de={de}
            ate={ate}
          />
          <ExportarBotoes
            atendimentos={linhasAtendimentos}
            produtividade={linhasProdutividade}
            alunos={linhasAlunos}
            ocupacao={linhasOcupacao}
            de={de}
            ate={ate}
          />
        </div>

        {erro && <p className="mt-4 text-sm text-red-600">Erro ao carregar: {erro}</p>}

        <GraficoAtendimentos linhas={linhasAtendimentos} tarefasConcluidas={(tarefasConcluidas ?? []) as { tipo: TipoTarefa }[]} />

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Atendimentos</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Aluno</th>
                  <th className="px-4 py-2">Classe</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Tarefa</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2">Saída</th>
                  <th className="px-4 py-2">Duração</th>
                </tr>
              </thead>
              <tbody>
                {linhasAtendimentos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      Nenhum atendimento no período com esses filtros.
                    </td>
                  </tr>
                )}
                {linhasAtendimentos.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(l.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{l.aluno_nome}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[l.aluno_classificacao].classe}`}
                      >
                        {l.aluno_classificacao}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{l.tarefa ? TIPOS_TAREFA[l.tarefa] : '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{l.entrada_hms}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {l.em_andamento ? '—' : l.saida_hms}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{l.duracao_hms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Produtividade por professor</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Atendimentos</th>
                  <th className="px-4 py-2">Tarefas concluídas</th>
                </tr>
              </thead>
              <tbody>
                {linhasProdutividade.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      Sem dados no período.
                    </td>
                  </tr>
                )}
                {linhasProdutividade.map((l) => (
                  <tr key={`${l.professor_id}-${l.data}`} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(l.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{l.total_atendimentos}</td>
                    <td className="px-4 py-2 text-gray-600">{l.total_tarefas_concluidas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Ocupação por professor</h2>
          <p className="mt-1 text-sm text-gray-500">
            Horas trabalhadas (atendimento + tarefa com cronômetro) sobre horas escaladas, no período filtrado. Acima de 40% ganha premiação.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Horas escaladas</th>
                  <th className="px-4 py-2">Horas trabalhadas</th>
                  <th className="px-4 py-2">Ocupação</th>
                </tr>
              </thead>
              <tbody>
                {linhasOcupacao.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      Nenhum professor ativo.
                    </td>
                  </tr>
                )}
                {linhasOcupacao.map((l) => (
                  <tr key={l.professor_id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-900">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{l.horas_escaladas}h</td>
                    <td className="px-4 py-2 text-gray-600">{l.horas_trabalhadas}h</td>
                    <td className="px-4 py-2">
                      {l.percentual === null ? (
                        <span className="text-xs text-gray-400">Sem escala cadastrada</span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            l.percentual >= 40
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {l.percentual}% {l.percentual >= 40 && '🏆'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Alunos por professor, por período do dia</h2>
          <p className="mt-1 text-sm text-gray-500">
            Média de alunos que entraram por dia (do período filtrado) sobre a média de professores escalados nesse
            horário (da escala semanal). Proporção ideal: {PROPORCAO_IDEAL} alunos por professor.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Período</th>
                  <th className="px-4 py-2">Média de alunos/dia</th>
                  <th className="px-4 py-2">Média de professores escalados</th>
                  <th className="px-4 py-2">Proporção</th>
                </tr>
              </thead>
              <tbody>
                {linhasProporcao.map((l) => {
                  const foraDoIdeal = l.proporcao !== null && (l.proporcao > PROPORCAO_IDEAL + 1 || l.proporcao < PROPORCAO_IDEAL - 1.5)
                  return (
                    <tr key={l.periodo} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-900">{NOMES_PERIODO[l.periodo]}</td>
                      <td className="px-4 py-2 text-gray-600">{l.media_alunos}</td>
                      <td className="px-4 py-2 text-gray-600">{l.media_professores}</td>
                      <td className="px-4 py-2">
                        {l.proporcao === null ? (
                          <span className="text-xs text-gray-400">Sem professor escalado</span>
                        ) : (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              foraDoIdeal ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {l.proporcao} : 1 {l.proporcao > PROPORCAO_IDEAL + 1 ? '(sobrecarga)' : l.proporcao < PROPORCAO_IDEAL - 1.5 ? '(ociosidade)' : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Alunos matriculados</h2>
          <p className="mt-1 text-sm text-gray-500">
            Lista completa de alunos cadastrados no sistema, independente do período filtrado acima.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Matrícula</th>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Classe</th>
                  <th className="px-4 py-2">Telefone</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Data da matrícula</th>
                  <th className="px-4 py-2">Situação do plano</th>
                </tr>
              </thead>
              <tbody>
                {linhasAlunos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      Nenhum aluno cadastrado.
                    </td>
                  </tr>
                )}
                {linhasAlunos.map((a) => {
                  const plano = statusPlano(a.vencimento_plano)
                  return (
                    <tr key={a.nome + (a.matricula ?? '')} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-600">{a.matricula ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-900">{a.nome}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[a.classificacao].classe}`}
                        >
                          {a.classificacao}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{a.telefone ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{a.professores?.nome ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {a.data_matricula ? new Date(`${a.data_matricula}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {plano ? (
                          <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${plano.classe}`}>
                            {plano.rotulo}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Em dia</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
