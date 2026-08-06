import type { Classificacao, Genero, TipoTarefa, StatusTarefa, TipoIntervalo, TipoAvaliacao, HorarioProfessor } from '@/lib/tipos'

// "Hoje" no fuso de Brasília — nunca use new Date().toISOString().slice(0,10)
// pra isso: o JS usa UTC (3h à frente de Brasília), então o "dia vira" cedo
// demais (a partir das ~21h) e o sistema mostra dado errado no fim do dia.
export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

// Mesma lógica, com deslocamento em dias (negativo = passado, positivo = futuro).
export function dataDeslocadaISO(deltaDias: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(Date.now() + deltaDias * 86400000),
  )
}

export function valorOuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}
export function parseAlertas(v: FormDataEntryValue | null): string[] {
  return String(v ?? '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
export const CLASSIFICACOES: Record<Classificacao, { rotulo: string; classe: string }> = {
  A: { rotulo: 'A — sem restrições', classe: 'bg-green-100 text-green-800 border-green-300' },
  B: { rotulo: 'B — leves restrições', classe: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  C: { rotulo: 'C — com restrições', classe: 'bg-red-100 text-red-800 border-red-300' },
  R: { rotulo: 'R — resgate/faltoso', classe: 'bg-purple-100 text-purple-800 border-purple-300' },
}
export const GENEROS: Record<Genero, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
}
export function diasDesde(data: string | null): number | null {
  if (!data) return null
  const ms = Date.now() - new Date(data).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}
// Idade em anos completos a partir da data de nascimento.
export function idadeDesde(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  if (aindaNaoFezAniversario) idade--
  return idade
}
// Quantos dias faltam pro próximo aniversário do aluno (0 = hoje).
// null se não tiver data de nascimento cadastrada. Usa só dia/mês — o ano
// de nascimento não importa aqui, só serve pra calcular idade em outro lugar.
export function diasParaAniversario(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const hoje = new Date(`${hojeISO()}T00:00:00`)
  const [, mesTexto, diaTexto] = dataNascimento.split('-')
  const mes = Number(mesTexto)
  const dia = Number(diaTexto)
  let proximo = new Date(hoje.getFullYear(), mes - 1, dia)
  if (proximo < hoje) proximo = new Date(hoje.getFullYear() + 1, mes - 1, dia)
  const diffMs = proximo.getTime() - hoje.getTime()
  return Math.round(diffMs / 86400000)
}
// Selo de vencimento do plano: vencido (vermelho) ou vence em até 7 dias
// (amarelo). Sem selo quando o plano está tranquilo ou não tem data.
export function statusPlano(vencimento: string | null): { rotulo: string; classe: string } | null {
  if (!vencimento) return null
  const hoje = hojeISO()
  const emSeteDias = dataDeslocadaISO(7)
  if (vencimento < hoje) return { rotulo: 'Plano vencido', classe: 'bg-red-50 text-red-700' }
  if (vencimento <= emSeteDias) return { rotulo: 'Vence em breve', classe: 'bg-yellow-50 text-yellow-700' }
  return null
}
export const TIPOS_TAREFA: Record<TipoTarefa, string> = {
  prescricao: 'Prescrição de treino',
  laudo: 'Laudo',
  momento_coach: 'Momento coach',
  lanche: 'Lanche',
}
export const STATUS_TAREFA: Record<StatusTarefa, { rotulo: string; classe: string }> = {
  a_realizar: { rotulo: 'A realizar', classe: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  concluida: { rotulo: 'Concluída', classe: 'bg-green-100 text-green-800 border-green-300' },
  agendar: { rotulo: 'Agendar', classe: 'bg-blue-100 text-blue-800 border-blue-300' },
  realizar_novamente: { rotulo: 'Realizar novamente', classe: 'bg-orange-100 text-orange-800 border-orange-300' },
  cancelada: { rotulo: 'Cancelada', classe: 'bg-gray-100 text-gray-500 border-gray-300' },
}
export const STATUS_TAREFA_SELECIONAVEIS: StatusTarefa[] = ['a_realizar', 'concluida', 'agendar', 'realizar_novamente']
export function formatarDataTarefa(dataIso: string): string {
  const hoje = hojeISO()
  const amanha = dataDeslocadaISO(1)
  if (dataIso === hoje) return 'hoje'
  if (dataIso === amanha) return 'amanhã'
  const [ano, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}/${ano}`
}
export const TIPOS_INTERVALO: Record<TipoIntervalo, string> = {
  almoco: 'Almoço',
  lanche: 'Lanche',
  janta: 'Janta',
  outro: 'Intervalo',
}
export const TIPOS_AVALIACAO: Record<TipoAvaliacao, string> = {
  coach: 'Avaliação coach',
  nutricional: 'Avaliação nutricional',
  funcional: 'Avaliação funcional',
}
// Selo de situação da avaliação: nunca feita, vencida, vencendo em até 7
// dias, ou em dia. Diferente de statusPlano, sempre retorna algo (usado
// pra colorir todo item da lista, não só os que têm problema).
export function statusAvaliacao(proximaData: string | null): { rotulo: string; classe: string } {
  if (!proximaData) return { rotulo: 'Nunca avaliada', classe: 'bg-red-100 text-red-800 border-red-300' }
  const hoje = hojeISO()
  const emSeteDias = dataDeslocadaISO(7)
  if (proximaData < hoje) return { rotulo: 'Vencida', classe: 'bg-red-100 text-red-800 border-red-300' }
  if (proximaData <= emSeteDias) return { rotulo: 'Vence em breve', classe: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
  return { rotulo: 'Em dia', classe: 'bg-green-100 text-green-800 border-green-300' }
}
export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
// hhmmss vem do Postgres como "HH:MM:SS" — mostra só "HH:MM".
export function formatarHoraCurta(hhmmss: string): string {
  return hhmmss.slice(0, 5)
}
// Resume os blocos de escala num texto curto, tipo "Seg-Sex 06:00–12:00".
// Agrupa dias consecutivos com o mesmo horário; blocos diferentes (ex:
// manhã e noite) aparecem separados por "; ".
export function formatarEscalaResumo(horarios: HorarioProfessor[]): string {
  if (horarios.length === 0) return 'Sem escala cadastrada'

  const porFaixa = new Map<string, number[]>()
  for (const h of horarios) {
    const chave = `${h.hora_inicio}|${h.hora_fim}`
    const dias = porFaixa.get(chave) ?? []
    dias.push(h.dia_semana)
    porFaixa.set(chave, dias)
  }

  function diasComoIntervalos(dias: number[]): string {
    const ordenados = [...dias].sort((a, b) => a - b)
    const abrev = (d: number) => DIAS_SEMANA[d].slice(0, 3)
    const grupos: number[][] = []
    let atual: number[] = [ordenados[0]]
    for (let i = 1; i < ordenados.length; i++) {
      if (ordenados[i] === ordenados[i - 1] + 1) {
        atual.push(ordenados[i])
      } else {
        grupos.push(atual)
        atual = [ordenados[i]]
      }
    }
    grupos.push(atual)
    return grupos
      .map((g) => (g.length === 1 ? abrev(g[0]) : `${abrev(g[0])}-${abrev(g[g.length - 1])}`))
      .join(', ')
  }

  const partes = [...porFaixa.entries()].map(([chave, dias]) => {
    const [inicio, fim] = chave.split('|')
    return `${diasComoIntervalos(dias)} ${formatarHoraCurta(inicio)}–${formatarHoraCurta(fim)}`
  })
  return partes.join('; ')
}

