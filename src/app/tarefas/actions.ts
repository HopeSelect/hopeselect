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
    status: String(fd.get('status') ?? 'a_realizar'),
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
// Usado tanto pelo botão rápido "Concluir" (/tarefas) quanto por outras
// trocas de status. Ao concluir, grava também o horário de fim (se ainda
// não tiver sido setado por "Concluir" na Sala).
export async function definirStatusTarefa(id: string, status: string) {
  const supabase = await criarClienteServer()
  const dados: Record<string, unknown> = { status }
  if (status === 'concluida') {
    const { data } = await supabase.from('tarefas').select('fim').eq('id', id).single()
    if (!data?.fim) dados.fim = new Date().toISOString()
  }
  await supabase.from('tarefas').update(dados).eq('id', id)
  revalidatePath('/tarefas')
  revalidatePath('/sala')
}
export async function excluirTarefa(id: string) {
  const supabase = await criarClienteServer()
  await supabase.from('tarefas').delete().eq('id', id)
  revalidatePath('/tarefas')
}
// Inicia o cronômetro da tarefa — usado no painel de Sala.
export async function iniciarTarefa(id: string) {
  const supabase = await criarClienteServer()
  await supabase.from('tarefas').update({ inicio: new Date().toISOString() }).eq('id', id)
  revalidatePath('/sala')
  revalidatePath('/tarefas')
}
// Conclui a tarefa e para o cronômetro — usado no painel de Sala.
export async function concluirTarefa(id: string) {
  const supabase = await criarClienteServer()
  await supabase
    .from('tarefas')
    .update({ fim: new Date().toISOString(), status: 'concluida' })
    .eq('id', id)
  revalidatePath('/sala')
  revalidatePath('/tarefas')
}
