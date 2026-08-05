'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'
import { valorOuNull } from '@/lib/utils'

export type EstadoForm = { erro: string } | null
export type ResultadoAcao = { erro: string } | null

function dadosNutricionista(fd: FormData) {
  return {
    nome: String(fd.get('nome') ?? '').trim(),
    foto_url: valorOuNull(fd.get('foto_url')),
    horario_trabalho: valorOuNull(fd.get('horario_trabalho')),
  }
}

export async function criarNutricionista(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const dados = dadosNutricionista(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('nutricionistas').insert(dados)
  if (error) return { erro: error.message }

  revalidatePath('/nutri')
  redirect('/nutri')
}

export async function definirAtivoNutricionista(id: string, ativo: boolean) {
  const supabase = await criarClienteServer()
  await supabase.from('nutricionistas').update({ ativo }).eq('id', id)
  revalidatePath('/nutri')
}

export async function alocarAlunoNutri(alunoId: string, nutricionistaId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  const { data: aberto } = await supabase
    .from('atendimentos_nutricionista')
    .select('id')
    .eq('aluno_id', alunoId)
    .is('fim', null)
    .maybeSingle()

  if (aberto) return { erro: 'Este aluno já está em atendimento com a nutricionista.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('atendimentos_nutricionista').insert({
    aluno_id: alunoId,
    nutricionista_id: nutricionistaId,
    registrado_por: user?.id ?? null,
  })
  if (error) return { erro: error.message }

  revalidatePath('/nutri')
  return null
}

export async function finalizarAtendimentoNutri(atendimentoId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('atendimentos_nutricionista')
    .update({ fim: new Date().toISOString() })
    .eq('id', atendimentoId)
    .is('fim', null)
  if (error) return { erro: error.message }

  revalidatePath('/nutri')
  return null
}
