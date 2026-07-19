'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'
import { valorOuNull, parseAlertas } from '@/lib/utils'

export type EstadoForm = { erro: string } | null

function dadosAluno(fd: FormData) {
  return {
    nome: String(fd.get('nome') ?? '').trim(),
    matricula: valorOuNull(fd.get('matricula')),
    telefone: valorOuNull(fd.get('telefone')),
    email: valorOuNull(fd.get('email')),
    data_nascimento: valorOuNull(fd.get('data_nascimento')),
    data_matricula: valorOuNull(fd.get('data_matricula')),
    inicio_plano: valorOuNull(fd.get('inicio_plano')),
    vencimento_plano: valorOuNull(fd.get('vencimento_plano')),
    classificacao: String(fd.get('classificacao') ?? 'A'),
    restricoes: valorOuNull(fd.get('restricoes')),
    observacoes: valorOuNull(fd.get('observacoes')),
    alertas: parseAlertas(fd.get('alertas')),
    origem: valorOuNull(fd.get('origem')),
    ultimo_acesso: valorOuNull(fd.get('ultimo_acesso')),
    professor_id: valorOuNull(fd.get('professor_id')),
    nutricionista: valorOuNull(fd.get('nutricionista')),
  }
}

export async function criarAluno(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosAluno(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('alunos').insert(dados)
  if (error) return { erro: error.message }

  revalidatePath('/alunos')
  redirect('/alunos')
}

export async function atualizarAluno(
  id: string,
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosAluno(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }

  const supabase = await criarClienteServer()
  const { error } = await supabase.from('alunos').update(dados).eq('id', id)
  if (error) return { erro: error.message }

  revalidatePath('/alunos')
  redirect('/alunos')
}

export async function excluirAluno(id: string) {
  const supabase = await criarClienteServer()
  await supabase.from('alunos').delete().eq('id', id)
  revalidatePath('/alunos')
}
