'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'
import { valorOuNull } from '@/lib/utils'

export type EstadoForm = { erro: string } | null

function dadosTarefa(fd: FormData) {
  return {
    aluno_id: String(fd.get('aluno_id') ?? ''),
    professor_id: String(fd.get('professor_id') ?? ''),
    tipo: String(fd.get('tipo') ?? 'prescricao'),
    data: String(fd.get('data') ?? ''),
    observacao: valorOuNull(fd.get('observacao')),
  }
}

export async function criarTarefa(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosTarefa(fd)
  if (!dados.aluno_id) return { erro: 'Selecione o aluno.' }
  if (!dados.professor_id) return { erro: 'Selecione o professor.' }
  if (!dados.data) return { erro: 'Informe a data.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('tarefas').insert(dados)
  if (error) return { erro: error.message }

  revalidatePath('/tarefas')
  redirect('/tarefas')
}

export async function atualizarTarefa(
  id: string,
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosTarefa(fd)
  if (!dados.aluno_id) return { erro: 'Selecione o aluno.' }
  if (!dados.professor_id) return { erro: 'Selecione o professor.' }
  if (!dados.data) return { erro: 'Informe a data.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('tarefas').update(dados).eq('id', id)
  if (error) return { erro: error.message }

  revalidatePath('/tarefas')
  redirect('/tarefas')
}

// Marca como concluída/pendente/cancelada direto na listagem (sem abrir form).
export async function definirStatusTarefa(id: string, status: string) {
  const supabase = await criarClienteServer()
  await supabase.from('tarefas').update({ status }).eq('id', id)
  revalidatePath('/tarefas')
}

export async function excluirTarefa(id: string) {
  const supabase = await criarClienteServer()
  await supabase.from('tarefas').delete().eq('id', id)
  revalidatePath('/tarefas')
}
