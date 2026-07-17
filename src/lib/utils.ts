import type { Classificacao, Genero, TipoTarefa, StatusTarefa, TipoIntervalo } from '@/lib/tipos'

// Converte um campo de formulário em string ou null (vazio => null).
export function valorOuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

// Alertas chegam como texto separado por vírgula ou quebra de linha.
export function parseAlertas(v: FormDataEntryValue | null): string[] {
  return String(v ?? '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// Cor/rótulo de cada classificação (requisito do cliente: leitura por cor).
export const CLASSIFICACOES: Record<
  Classificacao,
  { rotulo: string; classe: string }
> = {
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

// "Acesso há X dias" a partir do último acesso.
export function diasDesde(data: string | null): number | null {
  if (!data) return null
  const ms = Date.now() - new Date(data).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export const TIPOS_TAREFA: Record<TipoTarefa, string> = {
  prescricao: 'Prescrição de treino',
  laudo: 'Laudo',
  momento_coach: 'Momento coach',
}

export const STATUS_TAREFA: Record<StatusTarefa, { rotulo: string; classe: string }> = {
  pendente: { rotulo: 'Pendente', classe: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  concluida: { rotulo: 'Concluída', classe: 'bg-green-100 text-green-800 border-green-300' },
  cancelada: { rotulo: 'Cancelada', classe: 'bg-gray-100 text-gray-500 border-gray-300' },
}

// "hoje", "amanhã" ou dd/mm para exibir a data da tarefa de forma legível.
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
