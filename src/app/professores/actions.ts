'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'
import { valorOuNull } from '@/lib/utils'
export type EstadoForm = { erro: string } | null
function dadosProfessor(fd: FormData) {
  return {
    nome: String(fd.get('nome') ?? '').trim(),
    funcao: valorOuNull(fd.get('funcao')),
    foto_url: valorOuNull(fd.get('foto_url')),
    genero: String(fd.get('genero') ?? 'outro'),
    horario_trabalho: valorOuNull(fd.get('horario_trabalho')),
  }
}
export async function criarProfessor(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosProfessor(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }
  const supabase = await criarClienteServer()
  const { error } = await supabase.from('professores').insert(dados)
  if (error) return { erro: error.message }
  revalidatePath('/professores')
  redirect('/professores')
}
export async function atualizarProfessor(
  id: string,
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosProfessor(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }
  const supabase = await criarClienteServer()
  const { error } = await supabase.from('professores').update(dados).eq('id', id)
  if (error) return { erro: error.message }
  revalidatePath('/professores')
  redirect('/professores')
}
// Ativa/desativa em vez de excluir (professor pode ter atendimentos no histórico).
export async function definirAtivoProfessor(id: string, ativo: boolean) {
  const supabase = await criarClienteServer()
  await supabase.from('professores').update({ ativo }).eq('id', id)
  revalidatePath('/professores')
}
// Exclui de verdade. Só permite se o professor não tiver nenhum
// atendimento, tarefa ou intervalo no histórico — apagar isso quebraria
// relatórios já fechados. Com histórico, o caminho é inativar.
export async function excluirProfessor(id: string): Promise<{ erro: string } | null> {
  const supabase = await criarClienteServer()
  const [{ count: atendimentos }, { count: tarefas }, { count: lanches }] = await Promise.all([
    supabase.from('atendimentos').select('*', { count: 'exact', head: true }).eq('professor_id', id),
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('professor_id', id),
    supabase.from('lanches').select('*', { count: 'exact', head: true }).eq('professor_id', id),
  ])
  if ((atendimentos ?? 0) > 0 || (tarefas ?? 0) > 0 || (lanches ?? 0) > 0) {
    return {
      erro:
        'Este professor tem histórico (atendimentos, tarefas ou intervalos) e não pode ser excluído — isso apagaria dados de relatórios já fechados. Deixe-o inativo em vez de excluir.',
    }
  }
  const { error } = await supabase.from('professores').delete().eq('id', id)
  if (error) return { erro: error.message }
  revalidatePath('/professores')
  return null
}

export async function adicionarHorarioProfessor(
  professorId: string,
  fd: FormData,
): Promise<{ erro: string } | null> {
  const diaSemana = Number(fd.get('dia_semana'))
  const horaInicio = String(fd.get('hora_inicio') ?? '')
  const horaFim = String(fd.get('hora_fim') ?? '')

  if (!horaInicio || !horaFim) return { erro: 'Preencha início e fim.' }
  if (horaFim <= horaInicio) return { erro: 'O fim precisa ser depois do início.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('professor_horarios').insert({
    professor_id: professorId,
    dia_semana: diaSemana,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
  })
  if (error) return { erro: error.message }
  revalidatePath(`/professores/${professorId}`)
  return null
}

export async function removerHorarioProfessor(id: string, professorId: string) {
  const supabase = await criarClienteServer()
  await supabase.from('professor_horarios').delete().eq('id', id)
  revalidatePath(`/professores/${professorId}`)
}
