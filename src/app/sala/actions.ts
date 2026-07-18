'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServer } from '@/lib/supabase/server'
import type { TipoTarefa } from '@/lib/tipos'

export type ResultadoAcao = { erro: string } | null

// Aloca um aluno a um professor: abre um atendimento (inicio = agora).
// Regra de negócio: a recepção aloca, professor/aluno não escolhem.
export async function alocarAluno(
  alunoId: string,
  professorId: string,
  tarefa: TipoTarefa | null = null,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  const { data: aberto } = await supabase
    .from('atendimentos')
    .select('id')
    .eq('aluno_id', alunoId)
    .is('fim', null)
    .maybeSingle()

  if (aberto) return { erro: 'Este aluno já está em atendimento.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('atendimentos').insert({
    aluno_id: alunoId,
    professor_id: professorId,
    tarefa,
    registrado_por: user?.id ?? null,
  })
  if (error) return { erro: error.message }

  revalidatePath('/sala')
  return null
}

// Marca o fim do atendimento (a duração é calculada nas views, nunca armazenada).
export async function finalizarAtendimento(atendimentoId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('atendimentos')
    .update({ fim: new Date().toISOString() })
    .eq('id', atendimentoId)
    .is('fim', null)
  if (error) return { erro: error.message }

  revalidatePath('/sala')
  return null
}

// Persiste a posição do card arrastado. Sem revalidatePath de propósito:
// isso é chamado a cada "soltar" do arraste e outras telas já recebem a
// posição nova via realtime (tabela professores está na publication).
export async function atualizarPosicaoProfessor(
  id: string,
  posX: number,
  posY: number,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('professores')
    .update({ pos_x: Math.round(posX), pos_y: Math.round(posY) })
    .eq('id', id)
  if (error) return { erro: error.message }
  return null
}

// Inicia um intervalo (almoço/lanche/janta) para o professor.
// Regra do MVP: não é self-service, a recepção que marca.
export async function iniciarIntervalo(
  professorId: string,
  tipo: string,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  const { data: aberto } = await supabase
    .from('lanches')
    .select('id')
    .eq('professor_id', professorId)
    .is('fim', null)
    .maybeSingle()

  if (aberto) return { erro: 'Este professor já está em intervalo.' }

  const { error } = await supabase.from('lanches').insert({
    professor_id: professorId,
    tipo,
  })
  if (error) return { erro: error.message }

  revalidatePath('/sala')
  return null
}

// Encerra o intervalo em aberto.
export async function finalizarIntervalo(intervaloId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('lanches')
    .update({ fim: new Date().toISOString() })
    .eq('id', intervaloId)
    .is('fim', null)
  if (error) return { erro: error.message }

  revalidatePath('/sala')
  return null
}

// Adiciona um professor já cadastrado ao painel de sala.
export async function adicionarProfessorNaSala(professorId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('professores')
    .update({ em_sala: true })
    .eq('id', professorId)
  if (error) return { erro: error.message }

  revalidatePath('/sala')
  return null
}

// Remove o professor do painel (não mexe no cadastro).
// Trava: não deixa remover quem está em atendimento aberto.
export async function removerProfessorDaSala(professorId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  const { data: aberto } = await supabase
    .from('atendimentos')
    .select('id')
    .eq('professor_id', professorId)
    .is('fim', null)
    .maybeSingle()

  if (aberto) return { erro: 'Este professor está em atendimento. Finalize antes de remover da sala.' }

  const { error } = await supabase
    .from('professores')
    .update({ em_sala: false })
    .eq('id', professorId)
  if (error) return { erro: error.message }

  revalidatePath('/sala')
  return null
}
