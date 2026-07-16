'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServer } from '@/lib/supabase/server'

export type ResultadoAcao = { erro: string } | null

// Aloca um aluno a um professor: abre um atendimento (inicio = agora).
// Regra de negócio: a recepção aloca, professor/aluno não escolhem.
export async function alocarAluno(
  alunoId: string,
  professorId: string,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  // Evita duplicar: um aluno não pode estar em dois atendimentos abertos ao mesmo tempo.
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
