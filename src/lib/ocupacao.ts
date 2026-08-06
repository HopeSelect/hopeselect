import type { HorarioProfessor, LinhaOcupacaoProfessor } from './tipos'

interface AtendimentoParaOcupacao {
  professor_id: string
  duracao_min: number
}

interface TarefaParaOcupacao {
  professor_id: string
  inicio: string
  fim: string
}

// Cruza a escala semanal (professor_horarios) com o período filtrado pra
// saber "quantas horas esse professor deveria ter trabalhado" — conta
// quantas segundas/terças/etc existem no período e multiplica pela duração
// de cada bloco de escala daquele dia da semana.
export function calcularOcupacaoProfessor(
  professores: { id: string; nome: string }[],
  horarios: HorarioProfessor[],
  atendimentos: AtendimentoParaOcupacao[],
  tarefasComTempo: TarefaParaOcupacao[],
  de: string,
  ate: string,
): LinhaOcupacaoProfessor[] {
  const contagemDiaSemana = new Array(7).fill(0)
  const cursor = new Date(`${de}T00:00:00`)
  const fim = new Date(`${ate}T00:00:00`)
  while (cursor <= fim) {
    contagemDiaSemana[cursor.getDay()]++
    cursor.setDate(cursor.getDate() + 1)
  }

  const horasEscaladasPorProfessor = new Map<string, number>()
  for (const h of horarios) {
    const [hI, mI] = h.hora_inicio.split(':').map(Number)
    const [hF, mF] = h.hora_fim.split(':').map(Number)
    const duracaoHoras = (hF * 60 + mF - (hI * 60 + mI)) / 60
    const ocorrencias = contagemDiaSemana[h.dia_semana] ?? 0
    horasEscaladasPorProfessor.set(
      h.professor_id,
      (horasEscaladasPorProfessor.get(h.professor_id) ?? 0) + duracaoHoras * ocorrencias,
    )
  }

  // "Horas trabalhadas" soma atendimento (tempo com aluno) + tarefa com
  // cronômetro rodado (prescrição, laudo etc.) — é isso que o cliente
  // chamou de "trabalho e prescrição".
  const minutosTrabalhadosPorProfessor = new Map<string, number>()
  for (const a of atendimentos) {
    minutosTrabalhadosPorProfessor.set(
      a.professor_id,
      (minutosTrabalhadosPorProfessor.get(a.professor_id) ?? 0) + a.duracao_min,
    )
  }
  for (const t of tarefasComTempo) {
    const minutos = (new Date(t.fim).getTime() - new Date(t.inicio).getTime()) / 60000
    minutosTrabalhadosPorProfessor.set(
      t.professor_id,
      (minutosTrabalhadosPorProfessor.get(t.professor_id) ?? 0) + minutos,
    )
  }

  return professores
    .map((p) => {
      const horasEscaladas = horasEscaladasPorProfessor.get(p.id) ?? 0
      const horasTrabalhadas = (minutosTrabalhadosPorProfessor.get(p.id) ?? 0) / 60
      // null quando não tem escala cadastrada — não dá pra calcular % sem
      // saber quanto ele deveria trabalhar (dividir por zero não serve).
      const percentual = horasEscaladas > 0 ? (horasTrabalhadas / horasEscaladas) * 100 : null
      return {
        professor_id: p.id,
        professor_nome: p.nome,
        horas_escaladas: Math.round(horasEscaladas * 10) / 10,
        horas_trabalhadas: Math.round(horasTrabalhadas * 10) / 10,
        percentual: percentual !== null ? Math.round(percentual * 10) / 10 : null,
      }
    })
    .sort((a, b) => (b.percentual ?? -1) - (a.percentual ?? -1))
}
