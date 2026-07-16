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
