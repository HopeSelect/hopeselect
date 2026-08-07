import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import {
  hojeISO,
  dataDeslocadaISO,
  diasParaAniversario,
  TIPOS_AVALIACAO,
  TIPOS_ALERTA_ALUNO,
  statusAlertaAluno,
} from '@/lib/utils'
import { mediaProfessoresEscalados } from '@/lib/periodos'
import type { Aluno, HorarioProfessor, LinhaAlertaAlunoStatus, LinhaAvaliacaoStatus } from '@/lib/tipos'
import estilos from './inicio.module.css'
import { AtualizadorInicio } from './painel-inicio-ao-vivo'

type AtendimentosPorDia = { data: string; total_atendimentos: number }

function montarSparkline(porDia: AtendimentosPorDia[]) {
  const porData = new Map(porDia.map((d) => [d.data, d.total_atendimentos]))
  const dias: { label: string; data: string; total: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dataISO = dataDeslocadaISO(-i)
    const label = new Date(`${dataISO}T00:00:00`)
      .toLocaleDateString('pt-BR', { weekday: 'short' })
      .replace('.', '')
    dias.push({ label, data: dataISO, total: porData.get(dataISO) ?? 0 })
  }
  const maximo = Math.max(1, ...dias.map((d) => d.total))
  return dias.map((d) => ({
    ...d,
    alturaPct: d.total === 0 ? 4 : Math.max(10, Math.round((d.total / maximo) * 100)),
  }))
}

function horaSaoPaulo(iso: string): number {
  const hora = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).format(new Date(iso))
  const n = Number(hora)
  return n === 24 ? 0 : n
}

function montarPico(inicios: { inicio: string }[]) {
  const contagem = new Array(24).fill(0)
  for (const { inicio } of inicios) contagem[horaSaoPaulo(inicio)]++

  const horasComDado = contagem.map((total, hora) => ({ hora, total })).filter((h) => h.total > 0)
  if (horasComDado.length === 0)
    return { horas: [] as { hora: number; total: number }[], picoLabel: null as string | null }

  const minHora = Math.min(...horasComDado.map((h) => h.hora))
  const maxHora = Math.max(...horasComDado.map((h) => h.hora))
  const horas = []
  for (let h = minHora; h <= maxHora; h++) horas.push({ hora: h, total: contagem[h] })

  const pico = horas.reduce((a, b) => (b.total > a.total ? b : a))
  const picoLabel = `${String(pico.hora).padStart(2, '0')}h–${String((pico.hora + 1) % 24).padStart(2, '0')}h`

  return { horas, picoLabel }
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return (partes[0]?.[0] ?? '').concat(partes[1]?.[0] ?? '').toUpperCase()
}

const ATALHOS = [
  {
    href: '/sala',
    rotulo: 'Painel de Sala',
    path: 'M3 4h18v16H3zM6.5 7.5h7v5h-7z',
  },
  {
    href: '/professores',
    rotulo: 'Professores',
    path: 'M9 8.5a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5',
  },
  {
    href: '/alunos',
    rotulo: 'Alunos',
    path: 'M4 3.5h16v17H4zM8 8h8M8 12h8M8 16h5',
  },
  {
    href: '/avaliacoes',
    rotulo: 'Avaliações',
    path: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5v5l3.5 2',
  },
  {
    href: '/tarefas',
    rotulo: 'Tarefas',
    path: 'M5 4h14v17H5zM9 3.5h6v2H9zM8.5 12l2 2 4-4.2',
  },
  {
    href: '/relatorios',
    rotulo: 'Relatórios',
    path: 'M4 20V10M11 20V4M18 20v-7M2.5 20.5h19',
  },
]

export default async function InicioPage() {
  const supabase = await criarClienteServer()
  const hoje = hojeISO()

  const [
    { count: statAlunosNaSala },
    { count: statProfessoresAtivos },
    { count: statTotalAlunos },
    { data: porDia },
    { data: alunosRecentes },
    { data: atendimentos30dias },
    { data: alunosComNascimento },
    { data: statusAvaliacoes },
    { data: horariosProfessores },
    { data: statusAlertas60 },
  ] = await Promise.all([
    supabase.from('atendimentos').select('*', { count: 'exact', head: true }).is('fim', null),
    supabase.from('professores').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('alunos').select('*', { count: 'exact', head: true }),
    supabase
      .from('vw_atendimentos_por_dia')
      .select('data, total_atendimentos')
      .gte('data', dataDeslocadaISO(-6))
      .lte('data', hoje),
    supabase
      .from('alunos')
      .select('id, nome, classificacao, alertas')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('atendimentos')
      .select('inicio')
      .gte('data', dataDeslocadaISO(-29))
      .lte('data', hoje),
    supabase
      .from('alunos')
      .select('id, nome, classificacao, data_nascimento')
      .not('data_nascimento', 'is', null),
    supabase.from('vw_avaliacoes_status').select('*'),
    supabase.from('professor_horarios').select('*'),
    supabase.from('vw_alertas_aluno_status').select('*'),
  ])

  const sparkline = montarSparkline((porDia ?? []) as AtendimentosPorDia[])
  const statAtendimentosHoje = sparkline.find((d) => d.data === hoje)?.total ?? 0

  const alertasRecentes = (
    (alunosRecentes ?? []) as Pick<Aluno, 'id' | 'nome' | 'classificacao' | 'alertas'>[]
  )
    .filter((a) => a.alertas && a.alertas.length > 0)
    .slice(0, 4)

  const pico = montarPico((atendimentos30dias ?? []) as { inicio: string }[])
  const maiorPico = Math.max(1, ...pico.horas.map((h) => h.total))
  // Cruza cada hora do horário de pico com a escala semanal — mostra se
  // tem gente demais escalada pra pouco aluno (ociosidade) ou gente de
  // menos pra muito aluno (sobrecarga), sem precisar abrir Relatórios.
  const listaHorariosProfessores = (horariosProfessores ?? []) as HorarioProfessor[]
  const picoComEscala = pico.horas.map((h) => ({
    ...h,
    professores: mediaProfessoresEscalados(listaHorariosProfessores, h.hora, h.hora + 1),
  }))

  // Aniversariantes dos próximos 7 dias, ordenado por quem faz aniversário
  // primeiro — pra recepção conseguir dar parabéns sem ter que procurar
  // aluno por aluno.
  const aniversariantes = (
    (alunosComNascimento ?? []) as Pick<Aluno, 'id' | 'nome' | 'classificacao' | 'data_nascimento'>[]
  )
    .map((a) => ({ ...a, dias: diasParaAniversario(a.data_nascimento) }))
    .filter((a): a is typeof a & { dias: number } => a.dias !== null && a.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 6)

  // Avaliações vencidas, vencendo em até 7 dias, ou nunca registradas.
  const emSeteDias = dataDeslocadaISO(7)
  const todasAvaliacoes = (statusAvaliacoes ?? []) as LinhaAvaliacaoStatus[]
  const avaliacoesPendentes = todasAvaliacoes
    .filter((a) => !a.proxima_data || a.proxima_data <= emSeteDias)
    .sort((a, b) => (a.proxima_data ?? '0000-00-00').localeCompare(b.proxima_data ?? '0000-00-00'))

  // Alerta de 60 dias: prescrição, laudo e atendimento com a nutricionista
  // vencidos ou vencendo em até 7 dias.
  const todosAlertas60 = (statusAlertas60 ?? []) as LinhaAlertaAlunoStatus[]
  const alertas60Pendentes = todosAlertas60
    .filter((a) => !a.proxima_data || a.proxima_data <= emSeteDias)
    .sort((a, b) => (a.proxima_data ?? '0000-00-00').localeCompare(b.proxima_data ?? '0000-00-00'))

  return (
    <AppShell>
      <AtualizadorInicio />
      <div className={estilos.pagina}>
        <p className={estilos.boasVindas}>
          Bem-vindo(a) de volta. Aqui está o resumo de hoje na Hope Select.
        </p>

        <div className={estilos.gradeStats}>
          <div className={estilos.cardStat}>
            <div className={estilos.statRotulo}>Alunos na sala agora</div>
            <div className={estilos.statValor}>{statAlunosNaSala ?? 0}</div>
          </div>
          <div className={estilos.cardStat}>
            <div className={estilos.statRotulo}>Professores ativos</div>
            <div className={estilos.statValor}>{statProfessoresAtivos ?? 0}</div>
          </div>
          <div className={estilos.cardStat}>
            <div className={estilos.statRotulo}>Atendimentos hoje</div>
            <div className={estilos.statValor}>{statAtendimentosHoje}</div>
          </div>
          <div className={estilos.cardStat}>
            <div className={estilos.statRotulo}>Alunos cadastrados</div>
            <div className={estilos.statValor}>{statTotalAlunos ?? 0}</div>
          </div>
        </div>

        <div className={estilos.gradeMeio}>
          <div className={estilos.cardPainel}>
            <div className={estilos.painelTitulo}>Fluxo de atendimentos — últimos 7 dias</div>
            <div className={estilos.sparkline}>
              {sparkline.map((d) => {
                const dataFormatada = new Date(`${d.data}T00:00:00`).toLocaleDateString('pt-BR')
                return (
                  <div key={d.data} className={estilos.sparklineColuna}>
                    <span className={estilos.sparklineValor}>{d.total > 0 ? d.total : '\u00A0'}</span>
                    <div
                      className={estilos.sparklineBarraTrilho}
                      title={`${dataFormatada}: ${d.total} atendimento${d.total === 1 ? '' : 's'}`}
                    >
                      <div className={estilos.sparklineBarra} style={{ height: `${d.alturaPct}%` }} />
                    </div>
                    <span className={estilos.sparklineLabel}>{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={estilos.cardPainel}>
            <div className={estilos.painelTitulo}>Alertas recentes</div>
            <div className={estilos.listaAlertas}>
              {alertasRecentes.length === 0 && (
                <p className={estilos.semAlertas}>Nenhum alerta ativo no momento.</p>
              )}
              {alertasRecentes.map((a) => (
                <div key={a.id} className={estilos.linhaAlerta}>
                  <span className={estilos.avatar} data-classe={a.classificacao}>
                    {iniciais(a.nome)}
                  </span>
                  <div className={estilos.linhaAlertaTexto}>
                    <div className={estilos.linhaAlertaNome}>{a.nome}</div>
                    <div className={estilos.linhaAlertaAlertas}>{a.alertas.join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={estilos.gradeMeio}>
          <div className={estilos.cardPainel}>
            <div className={estilos.painelTitulo}>Aniversariantes da semana</div>
            <div className={estilos.listaAlertas}>
              {aniversariantes.length === 0 && (
                <p className={estilos.semAlertas}>Nenhum aniversário nos próximos 7 dias.</p>
              )}
              {aniversariantes.map((a) => (
                <div key={a.id} className={estilos.linhaAlerta}>
                  <span className={estilos.avatar} data-classe={a.classificacao}>
                    {iniciais(a.nome)}
                  </span>
                  <div className={estilos.linhaAlertaTexto}>
                    <div className={estilos.linhaAlertaNome}>{a.nome}</div>
                    <div className={estilos.linhaAlertaAlertas}>
                      {a.dias === 0 ? '🎂 Hoje!' : `🎂 Em ${a.dias} dia${a.dias === 1 ? '' : 's'}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={estilos.cardPainel}>
            <div className={estilos.painelTitulo}>
              Avaliações pendentes
              {avaliacoesPendentes.length > 0 && (
                <span className={estilos.picoDestaque}> · {avaliacoesPendentes.length}</span>
              )}
            </div>
            <div className={estilos.listaAlertas}>
              {avaliacoesPendentes.length === 0 && (
                <p className={estilos.semAlertas}>Nenhuma avaliação pendente. 🎉</p>
              )}
              {avaliacoesPendentes.slice(0, 6).map((a) => (
                <div key={`${a.aluno_id}-${a.tipo}`} className={estilos.linhaAlerta}>
                  <span className={estilos.avatar} data-classe="C">
                    {iniciais(a.aluno_nome)}
                  </span>
                  <div className={estilos.linhaAlertaTexto}>
                    <div className={estilos.linhaAlertaNome}>{a.aluno_nome}</div>
                    <div className={estilos.linhaAlertaAlertas}>
                      {TIPOS_AVALIACAO[a.tipo]} ·{' '}
                      {a.proxima_data ? `venceu em ${new Date(`${a.proxima_data}T00:00:00`).toLocaleDateString('pt-BR')}` : 'nunca feita'}
                    </div>
                  </div>
                </div>
              ))}
              {avaliacoesPendentes.length > 0 && (
                <Link href="/avaliacoes" className="mt-1 block text-center text-xs text-gray-500 dark:text-gray-400 underline">
                  Ver todas
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className={estilos.cardPainel} style={{ marginBottom: 'var(--space-6)' }}>
          <div className={estilos.painelTitulo}>
            Prescrição, laudo e nutricionista — vencidos ou vencendo
            {alertas60Pendentes.length > 0 && (
              <span className={estilos.picoDestaque}> · {alertas60Pendentes.length}</span>
            )}
          </div>
          <p className="mt-0 mb-3 text-xs text-gray-400 dark:text-gray-500">
            A cada 60 dias, todo aluno deveria ter prescrição de treino, laudo e atendimento com a nutricionista renovados.
          </p>
          <div className={estilos.listaAlertas}>
            {alertas60Pendentes.length === 0 && (
              <p className={estilos.semAlertas}>Nada vencido ou vencendo em breve. 🎉</p>
            )}
            {alertas60Pendentes.slice(0, 6).map((a) => {
              const selo = statusAlertaAluno(a.proxima_data)
              return (
                <div key={`${a.aluno_id}-${a.tipo}`} className={estilos.linhaAlerta}>
                  <span className={estilos.avatar} data-classe="C">
                    {iniciais(a.aluno_nome)}
                  </span>
                  <div className={estilos.linhaAlertaTexto}>
                    <div className={estilos.linhaAlertaNome}>{a.aluno_nome}</div>
                    <div className={estilos.linhaAlertaAlertas}>
                      {TIPOS_ALERTA_ALUNO[a.tipo]} · {selo.rotulo}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={estilos.cardPainel} style={{ marginBottom: 'var(--space-6)' }}>
          <div className={estilos.painelTitulo}>
            Horário de pico — últimos 30 dias
            {pico.picoLabel && <span className={estilos.picoDestaque}> · pico: {pico.picoLabel}</span>}
          </div>
          <p className="mt-0 mb-3 text-xs text-gray-400 dark:text-gray-500">
            Número pequeno embaixo do valor = média de professores escalados nesse horário (da escala semanal).
          </p>
          {picoComEscala.length === 0 ? (
            <p className={estilos.semAlertas}>Ainda não há atendimentos suficientes pra calcular.</p>
          ) : (
            <div className={estilos.sparkline}>
              {picoComEscala.map((h) => {
                const sobrecarga = h.professores > 0 && h.total / h.professores > 6
                return (
                  <div key={h.hora} className={estilos.sparklineColuna}>
                    <span className={estilos.sparklineValor}>{h.total > 0 ? h.total : '\u00A0'}</span>
                    <div
                      className={estilos.sparklineBarraTrilho}
                      title={`${String(h.hora).padStart(2, '0')}h–${String((h.hora + 1) % 24).padStart(2, '0')}h: ${h.total} atendimento${h.total === 1 ? '' : 's'} · ${h.professores} professor(es) escalado(s) em média`}
                    >
                      <div
                        className={estilos.sparklineBarra}
                        style={{
                          height: `${h.total === 0 ? 4 : Math.max(10, Math.round((h.total / maiorPico) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className={estilos.sparklineLabel}>{h.hora}h</span>
                    <span className={estilos.sparklineProfessores} data-sobrecarga={sobrecarga}>
                      👤{h.professores}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className={estilos.painelTitulo}>Atalhos</div>
        <div className={estilos.gradeAtalhos}>
          {ATALHOS.map((atalho) => (
            <Link key={atalho.href} href={atalho.href} className={estilos.atalho}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={atalho.path} />
              </svg>
              <span>{atalho.rotulo}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
