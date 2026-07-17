import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import type { Aluno } from '@/lib/tipos'
import estilos from './inicio.module.css'

// Dados de vw_atendimentos_por_dia (migration 20260715120100_views_relatorios.sql).
type AtendimentosPorDia = { data: string; total_atendimentos: number }

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}
function diasAtrasISO(dias: number) {
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return (partes[0]?.[0] ?? '').concat(partes[1]?.[0] ?? '').toUpperCase()
}

// Monta os últimos 7 dias (com zero para dias sem atendimento) a partir do
// que veio da view — a agregação em si já saiu pronta do banco.
function montarSparkline(porDia: AtendimentosPorDia[]) {
  const porData = new Map(porDia.map((d) => [d.data, d.total_atendimentos]))
  const dias: { label: string; data: string; total: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dataISO = diasAtrasISO(i)
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
  ] = await Promise.all([
    supabase.from('atendimentos').select('*', { count: 'exact', head: true }).is('fim', null),
    supabase.from('professores').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('alunos').select('*', { count: 'exact', head: true }),
    supabase
      .from('vw_atendimentos_por_dia')
      .select('data, total_atendimentos')
      .gte('data', diasAtrasISO(6))
      .lte('data', hoje),
    supabase
      .from('alunos')
      .select('id, nome, classificacao, alertas')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const sparkline = montarSparkline((porDia ?? []) as AtendimentosPorDia[])
  const statAtendimentosHoje = sparkline.find((d) => d.data === hoje)?.total ?? 0

  const alertasRecentes = (
    (alunosRecentes ?? []) as Pick<Aluno, 'id' | 'nome' | 'classificacao' | 'alertas'>[]
  )
    .filter((a) => a.alertas && a.alertas.length > 0)
    .slice(0, 4)

  return (
    <AppShell>
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
              {sparkline.map((d) => (
                <div key={d.data} className={estilos.sparklineColuna}>
                  <div className={estilos.sparklineBarraTrilho}>
                    <div className={estilos.sparklineBarra} style={{ height: `${d.alturaPct}%` }} />
                  </div>
                  <span className={estilos.sparklineLabel}>{d.label}</span>
                </div>
              ))}
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
