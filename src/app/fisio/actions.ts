'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'
import { valorOuNull, hojeISO } from '@/lib/utils'

export type EstadoForm = { erro: string } | null
export type ResultadoAcao = { erro: string } | null

function dadosFisioterapeuta(fd: FormData) {
  return {
    nome: String(fd.get('nome') ?? '').trim(),
    foto_url: valorOuNull(fd.get('foto_url')),
    horario_trabalho: valorOuNull(fd.get('horario_trabalho')),
  }
}

export async function criarFisioterapeuta(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const dados = dadosFisioterapeuta(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('fisioterapeutas').insert(dados)
  if (error) return { erro: error.message }

  revalidatePath('/fisio')
  redirect('/fisio')
}

export async function definirAtivoFisioterapeuta(id: string, ativo: boolean) {
  const supabase = await criarClienteServer()
  await supabase.from('fisioterapeutas').update({ ativo }).eq('id', id)
  revalidatePath('/fisio')
}

export async function alocarAlunoFisio(alunoId: string, fisioterapeutaId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()

  const { data: aberto } = await supabase
    .from('atendimentos_fisioterapeuta')
    .select('id')
    .eq('aluno_id', alunoId)
    .is('fim', null)
    .maybeSingle()

  if (aberto) return { erro: 'Este aluno já está em atendimento com o fisioterapeuta.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('atendimentos_fisioterapeuta').insert({
    aluno_id: alunoId,
    fisioterapeuta_id: fisioterapeutaId,
    registrado_por: user?.id ?? null,
  })
  if (error) return { erro: error.message }

  await supabase.from('alunos').update({ ultimo_acesso: hojeISO() }).eq('id', alunoId)

  revalidatePath('/fisio')
  return null
}

export async function finalizarAtendimentoFisio(atendimentoId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServer()
  const { error } = await supabase
    .from('atendimentos_fisioterapeuta')
    .update({ fim: new Date().toISOString() })
    .eq('id', atendimentoId)
    .is('fim', null)
  if (error) return { erro: error.message }

  revalidatePath('/fisio')
  return null
}
