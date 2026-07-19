import type { Classificacao, Genero, TipoTarefa, StatusTarefa, TipoIntervalo } from '@/lib/tipos'

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

// Selo de vencimento do plano: vencido (vermelho) ou vence em até 7 dias
// (amarelo). Sem selo quando o plano está tranquilo ou não tem data.
export function statusPlano(vencimento: string | null): { rotulo: string; classe: string } | null {
  if (!vencimento) return null
  const hoje = new Date().toISOString().slice(0, 10)
  const emSeteDias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
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
  const hoje = new Date().toISOString().slice(0, 10)
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
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
