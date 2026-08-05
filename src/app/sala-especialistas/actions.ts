'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServer } from '@/lib/supabase/server'

export type ResultadoAcao = { erro: string } | null

export async function alocarAlunoEspecialista(
  alunoId: string,
  especialistaId: string,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  const { data: aberto } = await supabase
    .from('atendimentos_especialista')
    .select('id')
    .eq('aluno_id', alunoId)
    .is('fim', null)
    .maybeSingle()

  if (aberto) return { erro: 'Este aluno já está em atendimento com um especialista.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('atendimentos_especialista').insert({
    aluno_id: alunoId,
    especialista_id: especialistaId,
    registrado_por: user?.id ?? null,
  })
  if (error) return { erro: error.message }

  revalidatePath('/sala-especialistas')
  return null
}

export async function finalizarAtendimentoEspecialista(atendimentoId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('atendimentos_especialista')
    .update({ fim: new Date().toISOString() })
    .eq('id', atendimentoId)
    .is('fim', null)
  if (error) return { erro: error.message }

  revalidatePath('/sala-especialistas')
  return null
}

export async function atualizarPosicaoEspecialista(
  id: string,
  posX: number,
  posY: number,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('especialistas')
    .update({ pos_x: Math.round(posX), pos_y: Math.round(posY) })
    .eq('id', id)
  if (error) return { erro: error.message }
  return null
}

export async function adicionarEspecialistaNaSala(id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase.from('especialistas').update({ em_sala: true }).eq('id', id)
  if (error) return { erro: error.message }
  revalidatePath('/sala-especialistas')
  return null
}

export async function removerEspecialistaDaSala(id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  const { data: aberto } = await supabase
    .from('atendimentos_especialista')
    .select('id')
    .eq('especialista_id', id)
    .is('fim', null)
    .maybeSingle()

  if (aberto) return { erro: 'Este especialista está em atendimento. Finalize antes de remover da sala.' }

  const { error } = await supabase.from('especialistas').update({ em_sala: false }).eq('id', id)
  if (error) return { erro: error.message }
  revalidatePath('/sala-especialistas')
  return null
}