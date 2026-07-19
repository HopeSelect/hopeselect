import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { CLASSIFICACOES, TIPOS_TAREFA } from '@/lib/utils'
import type {
  LinhaAtendimento,
  LinhaAtendimentosPorProfessor,
  LinhaProdutividade,
  LinhaTarefasPorProfessor,
} from '@/lib/tipos'
import { FiltrosAtendimentos } from './filtros-atendimentos'
import { GraficoAtendimentos } from './grafico-atendimentos'
import { ExportarBotoes } from './exportar-botoes'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}
function diasAtrasISO(dias: number) {
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
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
  const de = usaPeriodoPersonalizado ? (params.de as string) : diasAtrasISO(dias)
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

  const [
    { data: atendimentos, error: erroAtendimentos },
    { data: atendimentosPorProfessor, error: erroAtPorProf },
    { data: tarefasPorProfessor, error: erroTarefas },
    { data: professores },
  ] = await Promise.all([
    consultaAtendimentos,
    consultaAtPorProf,
    consultaTarefas,
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome'),
  ])

  const erro = erroAtendimentos?.message ?? erroAtPorProf?.message ?? erroTarefas?.message ?? null

  const linhasAtendimentos = (atendimentos ?? []) as LinhaAtendimento[]
  const linhasProdutividade = combinarProdutividade(
    (atendimentosPorProfessor ?? []) as LinhaAtendimentosPorProfessor[],
    (tarefasPorProfessor ?? []) as LinhaTarefasPorProfessor[],
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
            de={de}
            ate={ate}
          />
        </div>

        {erro && <p className="mt-4 text-sm text-red-600">Erro ao carregar: {erro}</p>}

        <GraficoAtendimentos linhas={linhasAtendimentos} />

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
      </main>
    </AppShell>
  )
}
