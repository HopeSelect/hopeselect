'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { criarClienteBrowser } from '@/lib/supabase/client'
import type { Aluno } from '@/lib/tipos'
import estilos from './inicio.module.css'

type AtendimentosPorDia = { data: string; total_atendimentos: number }
type AlertaAluno = Pick<Aluno, 'id' | 'nome' | 'classificacao' | 'alertas'>

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}
function diasAtrasISO(dias: number) {
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
}

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

export interface DadosInicio {
  statAlunosNaSala: number
  statProfessoresAtivos: number
  statTotalAlunos: number
  statAtendimentosHoje: number
  sparkline: { label: string; data: string; total: number; alturaPct: number }[]
  alertasRecentes: AlertaAluno[]
  pico: { horas: { hora: number; total: number }[]; picoLabel: string | null }
  maiorPico: number
}

export function PainelInicioAoVivo({ inicial }: { inicial: DadosInicio }) {
  const supabase = useMemo(() => criarClienteBrowser(), [])
  const [dados, setDados] = useState(inicial)

  // Refaz as mesmas consultas que a home usa na primeira carga — mais
  // simples e seguro do que tentar "somar/subtrair" os números na mão a
  // cada evento, e o volume de dados de uma academia é pequeno o
  // suficiente pra isso ser barato.
  const recarregar = useCallback(async () => {
    const hoje = hojeISO()

    const [
      { count: statAlunosNaSala },
      { count: statProfessoresAtivos },
      { count: statTotalAlunos },
      { data: porDia },
      { data: alunosRecentes },
      { data: atendimentos30dias },
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
      supabase
        .from('atendimentos')
        .select('inicio')
        .gte('data', diasAtrasISO(29))
        .lte('data', hoje),
    ])

    const sparkline = montarSparkline((porDia ?? []) as AtendimentosPorDia[])
    const statAtendimentosHoje = sparkline.find((d) => d.data === hoje)?.total ?? 0
    const alertasRecentes = ((alunosRecentes ?? []) as AlertaAluno[])
      .filter((a) => a.alertas && a.alertas.length > 0)
      .slice(0, 4)
    const pico = montarPico((atendimentos30dias ?? []) as { inicio: string }[])
    const maiorPico = Math.max(1, ...pico.horas.map((h) => h.total))

    setDados({
      statAlunosNaSala: statAlunosNaSala ?? 0,
      statProfessoresAtivos: statProfessoresAtivos ?? 0,
      statTotalAlunos: statTotalAlunos ?? 0,
      statAtendimentosHoje,
      sparkline,
      alertasRecentes,
      pico,
      maiorPico,
    })
  }, [supabase])

  useEffect(() => {
    const canal = supabase
      .channel('painel-inicio')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendimentos' }, () => {
        void recarregar()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => {
        void recarregar()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professores' }, () => {
        void recarregar()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [supabase, recarregar])

  return (
    <>
      <div className={estilos.gradeStats}>
        <div className={estilos.cardStat}>
          <div className={estilos.statRotulo}>Alunos na sala agora</div>
          <div className={estilos.statValor}>{dados.statAlunosNaSala}</div>
        </div>
        <div className={estilos.cardStat}>
          <div className={estilos.statRotulo}>Professores ativos</div>
          <div className={estilos.statValor}>{dados.statProfessoresAtivos}</div>
        </div>
        <div className={estilos.cardStat}>
          <div className={estilos.statRotulo}>Atendimentos hoje</div>
          <div className={estilos.statValor}>{dados.statAtendimentosHoje}</div>
        </div>
        <div className={estilos.cardStat}>
          <div className={estilos.statRotulo}>Alunos cadastrados</div>
          <div className={estilos.statValor}>{dados.statTotalAlunos}</div>
        </div>
      </div>

      <div className={estilos.gradeMeio}>
        <div className={estilos.cardPainel}>
          <div className={estilos.painelTitulo}>Fluxo de atendimentos — últimos 7 dias</div>
          <div className={estilos.sparkline}>
            {dados.sparkline.map((d) => {
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
            {dados.alertasRecentes.length === 0 && (
              <p className={estilos.semAlertas}>Nenhum alerta ativo no momento.</p>
            )}
            {dados.alertasRecentes.map((a) => (
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

      <div className={estilos.cardPainel} style={{ marginBottom: 'var(--space-6)' }}>
        <div className={estilos.painelTitulo}>
          Horário de pico — últimos 30 dias
          {dados.pico.picoLabel && <span className={estilos.picoDestaque}> · pico: {dados.pico.picoLabel}</span>}
        </div>
        {dados.pico.horas.length === 0 ? (
          <p className={estilos.semAlertas}>Ainda não há atendimentos suficientes pra calcular.</p>
        ) : (
          <div className={estilos.sparkline}>
            {dados.pico.horas.map((h) => (
              <div key={h.hora} className={estilos.sparklineColuna}>
                <span className={estilos.sparklineValor}>{h.total > 0 ? h.total : '\u00A0'}</span>
                <div
                  className={estilos.sparklineBarraTrilho}
                  title={`${String(h.hora).padStart(2, '0')}h–${String((h.hora + 1) % 24).padStart(2, '0')}h: ${h.total} atendimento${h.total === 1 ? '' : 's'}`}
                >
                  <div
                    className={estilos.sparklineBarra}
                    style={{
                      height: `${h.total === 0 ? 4 : Math.max(10, Math.round((h.total / dados.maiorPico) * 100))}%`,
                    }}
                  />
                </div>
                <span className={estilos.sparklineLabel}>{h.hora}h</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}