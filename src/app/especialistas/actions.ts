'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'
import { valorOuNull } from '@/lib/utils'

export type EstadoForm = { erro: string } | null

function dadosEspecialista(fd: FormData) {
  return {
    nome: String(fd.get('nome') ?? '').trim(),
    tipo: String(fd.get('tipo') ?? 'nutricionista'),
    foto_url: valorOuNull(fd.get('foto_url')),
    horario_trabalho: valorOuNull(fd.get('horario_trabalho')),
  }
}

export async function criarEspecialista(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosEspecialista(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('especialistas').insert(dados)
  if (error) return { erro: error.message }

  revalidatePath('/especialistas')
  redirect('/especialistas')
}

export async function atualizarEspecialista(
  id: string,
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosEspecialista(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('especialistas').update(dados).eq('id', id)
  if (error) return { erro: error.message }

  revalidatePath('/especialistas')
  redirect('/especialistas')
}

export async function definirAtivoEspecialista(id: string, ativo: boolean) {
  const supabase = await criarClienteServer()
  await supabase.from('especialistas').update({ ativo }).eq('id', id)
  revalidatePath('/especialistas')
}