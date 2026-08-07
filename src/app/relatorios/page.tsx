import Link from 'next/link'
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
import { GraficoNutriFisio } from './grafico-nutri-fisio'
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

// Total de atendimentos por profissional (nutricionista ou fisioterapeuta),
// no período filtrado — mesmo desenho de LinhaAtendimentosPorProfessor, só
// que pros dois módulos novos e mais simples (sem view de banco dedicada,
// já que o volume é pequeno o suficiente pra agregar aqui mesmo).
export interface LinhaNutriFisioResumo {
  tipo: 'nutri' | 'fisio'
  profissional_id: string
  profissional_nome: string
  total_atendimentos: number
}

function resumirPorProfissional(
  linhas: { id: string; nome: string }[],
  tipo: 'nutri' | 'fisio',
): LinhaNutriFisioResumo[] {
  const mapa = new Map<string, LinhaNutriFisioResumo>()
  for (const l of linhas) {
    const existente = mapa.get(l.id)
    if (existente) existente.total_atendimentos++
    else mapa.set(l.id, { tipo, profissional_id: l.id, profissional_nome: l.nome, total_atendimentos: 1 })
  }
  return [...mapa.values()].sort((a, b) => b.total_atendimentos - a.total_atendimentos)
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
  searchParams: Promise<{
    aluno?: string
    professor?: string
    tipo?: string
    dias?: string
    de?: string
    ate?: string
    pagina?: string
    paginaAlunos?: string
    paginaProdutividade?: string
  }>
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

  // Sem filtro de período de propósito — o padrão da tela é "últimos 7
  // dias", o que escondia tarefas concluídas mais antigas sem ninguém
  // perceber (bug relatado: "tem mais prescrições, não está contando").
  // Só o filtro de professor continua valendo, se selecionado.
  let consultaTarefasConcluidas = supabase.from('tarefas').select('tipo').eq('status', 'concluida')
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
    { data: atendimentosNutri, error: erroNutri },
    { data: atendimentosFisio, error: erroFisio },
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
    supabase
      .from('atendimentos_nutricionista')
      .select('nutricionista_id, data, nutricionistas(nome)')
      .gte('data', de)
      .lte('data', ate),
    supabase
      .from('atendimentos_fisioterapeuta')
      .select('fisioterapeuta_id, data, fisioterapeutas(nome)')
      .gte('data', de)
      .lte('data', ate),
  ])

  const erro =
    erroAtendimentos?.message ??
    erroAtPorProf?.message ??
    erroTarefas?.message ??
    erroAlunos?.message ??
    erroHorarios?.message ??
    erroTarefasComTempo?.message ??
    erroTarefasConcluidas?.message ??
    erroNutri?.message ??
    erroFisio?.message ??
    null

  const linhasAtendimentos = (atendimentos ?? []) as LinhaAtendimento[]

  // Paginação só afeta a tabela abaixo — gráficos, export e os cálculos de
  // ocupação/proporção continuam usando linhasAtendimentos por completo,
  // senão o gráfico ficaria mostrando só a página atual.
  const POR_PAGINA_ATENDIMENTOS = 15
  const paginaAtendimentos = Math.max(1, Number(params.pagina ?? '1') || 1)
  const totalPaginasAtendimentos = Math.max(1, Math.ceil(linhasAtendimentos.length / POR_PAGINA_ATENDIMENTOS))
  const atendimentosDaPagina = linhasAtendimentos.slice(
    (paginaAtendimentos - 1) * POR_PAGINA_ATENDIMENTOS,
    paginaAtendimentos * POR_PAGINA_ATENDIMENTOS,
  )
  function linkPaginaAtendimentos(p: number) {
    const sp = new URLSearchParams()
    if (params.aluno) sp.set('aluno', params.aluno)
    if (params.professor) sp.set('professor', params.professor)
    if (params.tipo) sp.set('tipo', params.tipo)
    if (usaPeriodoPersonalizado) {
      sp.set('de', de)
      sp.set('ate', ate)
    } else if (params.dias) {
      sp.set('dias', params.dias)
    }
    sp.set('pagina', String(p))
    return `/relatorios?${sp.toString()}`
  }

  const linhasProdutividade = combinarProdutividade(
    (atendimentosPorProfessor ?? []) as LinhaAtendimentosPorProfessor[],
    (tarefasPorProfessor ?? []) as LinhaTarefasPorProfessor[],
  )

  const POR_PAGINA_PRODUTIVIDADE = 15
  const paginaProdutividade = Math.max(1, Number(params.paginaProdutividade ?? '1') || 1)
  const totalPaginasProdutividade = Math.max(1, Math.ceil(linhasProdutividade.length / POR_PAGINA_PRODUTIVIDADE))
  const produtividadeDaPagina = linhasProdutividade.slice(
    (paginaProdutividade - 1) * POR_PAGINA_PRODUTIVIDADE,
    paginaProdutividade * POR_PAGINA_PRODUTIVIDADE,
  )
  function linkPaginaProdutividade(p: number) {
    const sp = new URLSearchParams()
    if (params.aluno) sp.set('aluno', params.aluno)
    if (params.professor) sp.set('professor', params.professor)
    if (params.tipo) sp.set('tipo', params.tipo)
    if (usaPeriodoPersonalizado) {
      sp.set('de', de)
      sp.set('ate', ate)
    } else if (params.dias) {
      sp.set('dias', params.dias)
    }
    if (params.pagina) sp.set('pagina', params.pagina)
    if (params.paginaAlunos) sp.set('paginaAlunos', params.paginaAlunos)
    sp.set('paginaProdutividade', String(p))
    return `/relatorios?${sp.toString()}`
  }

  const linhasAlunos = (todosAlunos ?? []) as unknown as LinhaAlunoRelatorio[]

  interface LinhaBrutaNutri {
    nutricionista_id: string
    data: string
    nutricionistas: { nome: string } | null
  }
  interface LinhaBrutaFisio {
    fisioterapeuta_id: string
    data: string
    fisioterapeutas: { nome: string } | null
  }
  const brutasNutri = (atendimentosNutri ?? []) as unknown as LinhaBrutaNutri[]
  const brutasFisio = (atendimentosFisio ?? []) as unknown as LinhaBrutaFisio[]
  const resumoNutri = resumirPorProfissional(
    brutasNutri.map((l) => ({ id: l.nutricionista_id, nome: l.nutricionistas?.nome ?? '—' })),
    'nutri',
  )
  const resumoFisio = resumirPorProfissional(
    brutasFisio.map((l) => ({ id: l.fisioterapeuta_id, nome: l.fisioterapeutas?.nome ?? '—' })),
    'fisio',
  )
  const resumoNutriFisio = [...resumoNutri, ...resumoFisio]

  // Mesmo padrão da tabela de Atendimentos: paginação só na tabela visual,
  // o export continua trazendo a lista completa.
  const POR_PAGINA_ALUNOS = 15
  const paginaAlunos = Math.max(1, Number(params.paginaAlunos ?? '1') || 1)
  const totalPaginasAlunos = Math.max(1, Math.ceil(linhasAlunos.length / POR_PAGINA_ALUNOS))
  const alunosDaPagina = linhasAlunos.slice(
    (paginaAlunos - 1) * POR_PAGINA_ALUNOS,
    paginaAlunos * POR_PAGINA_ALUNOS,
  )
  function linkPaginaAlunos(p: number) {
    const sp = new URLSearchParams()
    if (params.aluno) sp.set('aluno', params.aluno)
    if (params.professor) sp.set('professor', params.professor)
    if (params.tipo) sp.set('tipo', params.tipo)
    if (usaPeriodoPersonalizado) {
      sp.set('de', de)
      sp.set('ate', ate)
    } else if (params.dias) {
      sp.set('dias', params.dias)
    }
    if (params.pagina) sp.set('pagina', params.pagina)
    sp.set('paginaAlunos', String(p))
    return `/relatorios?${sp.toString()}`
  }
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
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
            nutriFisio={resumoNutriFisio}
            de={de}
            ate={ate}
          />
        </div>

        {erro && <p className="mt-4 text-sm text-red-600">Erro ao carregar: {erro}</p>}

        <GraficoAtendimentos linhas={linhasAtendimentos} tarefasConcluidas={(tarefasConcluidas ?? []) as { tipo: TipoTarefa }[]} />

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Atendimentos{' '}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
              ({linhasAtendimentos.length} no total)
            </span>
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
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
                {atendimentosDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhum atendimento no período com esses filtros.
                    </td>
                  </tr>
                )}
                {atendimentosDaPagina.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {new Date(l.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{l.aluno_nome}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[l.aluno_classificacao].classe}`}
                      >
                        {l.aluno_classificacao}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.tarefa ? TIPOS_TAREFA[l.tarefa] : '—'}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.entrada_hms}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {l.em_andamento ? '—' : l.saida_hms}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.duracao_hms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginasAtendimentos > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href={linkPaginaAtendimentos(paginaAtendimentos - 1)}
                aria-disabled={paginaAtendimentos <= 1}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaAtendimentos <= 1
                    ? 'pointer-events-none text-gray-300 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Anterior
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Página {paginaAtendimentos} de {totalPaginasAtendimentos}
              </span>
              <Link
                href={linkPaginaAtendimentos(paginaAtendimentos + 1)}
                aria-disabled={paginaAtendimentos >= totalPaginasAtendimentos}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaAtendimentos >= totalPaginasAtendimentos
                    ? 'pointer-events-none text-gray-300 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Próxima
              </Link>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Produtividade por professor{' '}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({linhasProdutividade.length} no total)</span>
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Atendimentos</th>
                  <th className="px-4 py-2">Tarefas concluídas</th>
                </tr>
              </thead>
              <tbody>
                {produtividadeDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Sem dados no período.
                    </td>
                  </tr>
                )}
                {produtividadeDaPagina.map((l) => (
                  <tr key={`${l.professor_id}-${l.data}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {new Date(l.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.total_atendimentos}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.total_tarefas_concluidas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginasProdutividade > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href={linkPaginaProdutividade(paginaProdutividade - 1)}
                aria-disabled={paginaProdutividade <= 1}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaProdutividade <= 1
                    ? 'pointer-events-none text-gray-300 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Anterior
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Página {paginaProdutividade} de {totalPaginasProdutividade}
              </span>
              <Link
                href={linkPaginaProdutividade(paginaProdutividade + 1)}
                aria-disabled={paginaProdutividade >= totalPaginasProdutividade}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaProdutividade >= totalPaginasProdutividade
                    ? 'pointer-events-none text-gray-300 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Próxima
              </Link>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ocupação por professor</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Horas trabalhadas (atendimento + tarefa com cronômetro) sobre horas escaladas, no período filtrado. Acima de 40% ganha premiação.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
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
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhum professor ativo.
                    </td>
                  </tr>
                )}
                {linhasOcupacao.map((l) => (
                  <tr key={l.professor_id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{l.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.horas_escaladas}h</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.horas_trabalhadas}h</td>
                    <td className="px-4 py-2">
                      {l.percentual === null ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Sem escala cadastrada</span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            l.percentual >= 40
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
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
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Nutri e Fisio{' '}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
              ({resumoNutriFisio.reduce((soma, l) => soma + l.total_atendimentos, 0)} atendimentos no período)
            </span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total de atendimentos por profissional, no período filtrado.</p>

          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Profissional</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Atendimentos</th>
                </tr>
              </thead>
              <tbody>
                {resumoNutriFisio.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhum atendimento de Nutri/Fisio no período.
                    </td>
                  </tr>
                )}
                {resumoNutriFisio.map((l) => (
                  <tr key={`${l.tipo}-${l.profissional_id}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{l.profissional_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {l.tipo === 'nutri' ? 'Nutricionista' : 'Fisioterapeuta'}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.total_atendimentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <GraficoNutriFisio nutri={brutasNutri.map((l) => ({ data: l.data }))} fisio={brutasFisio.map((l) => ({ data: l.data }))} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Alunos por professor, por período do dia</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Média de alunos que entraram por dia (do período filtrado) sobre a média de professores escalados nesse
            horário (da escala semanal). Proporção ideal: {PROPORCAO_IDEAL} alunos por professor.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
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
                    <tr key={l.periodo} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{NOMES_PERIODO[l.periodo]}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.media_alunos}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{l.media_professores}</td>
                      <td className="px-4 py-2">
                        {l.proporcao === null ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Sem professor escalado</span>
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
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Alunos matriculados{' '}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({linhasAlunos.length} no total)</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Lista completa de alunos cadastrados no sistema, independente do período filtrado acima.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
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
                {alunosDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhum aluno cadastrado.
                    </td>
                  </tr>
                )}
                {alunosDaPagina.map((a) => {
                  const plano = statusPlano(a.vencimento_plano)
                  return (
                    <tr key={a.nome + (a.matricula ?? '')} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{a.matricula ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{a.nome}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[a.classificacao].classe}`}
                        >
                          {a.classificacao}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{a.telefone ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{a.professores?.nome ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                        {a.data_matricula ? new Date(`${a.data_matricula}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {plano ? (
                          <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${plano.classe}`}>
                            {plano.rotulo}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Em dia</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPaginasAlunos > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href={linkPaginaAlunos(paginaAlunos - 1)}
                aria-disabled={paginaAlunos <= 1}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaAlunos <= 1 ? 'pointer-events-none text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Anterior
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Página {paginaAlunos} de {totalPaginasAlunos}
              </span>
              <Link
                href={linkPaginaAlunos(paginaAlunos + 1)}
                aria-disabled={paginaAlunos >= totalPaginasAlunos}
                className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                  paginaAlunos >= totalPaginasAlunos
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
