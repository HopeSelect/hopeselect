import type { HorarioProfessor, LinhaProporcaoPeriodo, Periodo } from './tipos'

export const FAIXAS_PERIODO: Record<Periodo, { inicio: number; fim: number }> = {
  manha: { inicio: 6, fim: 12 },
  tarde: { inicio: 12, fim: 18 },
  noite: { inicio: 18, fim: 23 },
}

export const NOMES_PERIODO: Record<Periodo, string> = {
  manha: 'Manhã (6h–12h)',
  tarde: 'Tarde (12h–18h)',
  noite: 'Noite (18h–23h)',
}

export const PROPORCAO_IDEAL = 3

function horaSaoPaulo(iso: string): number {
  const hora = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).format(new Date(iso))
  const n = Number(hora)
  return n === 24 ? 0 : n
}

function periodoDaHora(hora: number): Periodo | null {
  for (const [periodo, faixa] of Object.entries(FAIXAS_PERIODO) as [Periodo, { inicio: number; fim: number }][]) {
    if (hora >= faixa.inicio && hora < faixa.fim) return periodo
  }
  return null
}

function horaDecimal(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number)
  return h + m / 60
}

// Quantos professores, em média (ao longo dos 7 dias da semana), estão
// escalados numa faixa de horário — usado tanto pra proporção por período
// quanto pro cruzamento do horário de pico. A escala é fixa semanal, não
// depende do período de data filtrado nos atendimentos.
export function mediaProfessoresEscalados(
  horarios: HorarioProfessor[],
  horaInicio: number,
  horaFim: number,
): number {
  let soma = 0
  for (let dia = 0; dia < 7; dia++) {
    const profs = new Set<string>()
    for (const h of horarios) {
      if (h.dia_semana !== dia) continue
      const inicioH = horaDecimal(h.hora_inicio)
      const fimH = horaDecimal(h.hora_fim)
      // Cruza se o bloco começa antes da faixa acabar e termina depois dela começar.
      if (inicioH < horaFim && fimH > horaInicio) profs.add(h.professor_id)
    }
    soma += profs.size
  }
  return Math.round((soma / 7) * 10) / 10
}

export function calcularProporcaoPorPeriodo(
  atendimentos: { inicio: string }[],
  horarios: HorarioProfessor[],
  numeroDeDias: number,
): LinhaProporcaoPeriodo[] {
  const periodos: Periodo[] = ['manha', 'tarde', 'noite']

  const contagemAlunos: Record<Periodo, number> = { manha: 0, tarde: 0, noite: 0 }
  for (const a of atendimentos) {
    const p = periodoDaHora(horaSaoPaulo(a.inicio))
    if (p) contagemAlunos[p]++
  }

  return periodos.map((periodo) => {
    const faixa = FAIXAS_PERIODO[periodo]
    const mediaAlunos = numeroDeDias > 0 ? contagemAlunos[periodo] / numeroDeDias : 0
    const mediaProfessores = mediaProfessoresEscalados(horarios, faixa.inicio, faixa.fim)
    const proporcao = mediaProfessores > 0 ? mediaAlunos / mediaProfessores : null
    return {
      periodo,
      media_alunos: Math.round(mediaAlunos * 10) / 10,
      media_professores: mediaProfessores,
      proporcao: proporcao !== null ? Math.round(proporcao * 10) / 10 : null,
    }
  })
}
