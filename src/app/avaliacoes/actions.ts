'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServer } from '@/lib/supabase/server'
import { valorOuNull } from '@/lib/utils'

export type EstadoForm = { erro: string } | null

export async function registrarAvaliacao(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const aluno_id = String(fd.get('aluno_id') ?? '')
  const tipo = String(fd.get('tipo') ?? '')
  const data_realizada = String(fd.get('data_realizada') ?? '')
  const observacao = valorOuNull(fd.get('observacao'))

  if (!aluno_id) return { erro: 'Selecione o aluno.' }
  if (!tipo) return { erro: 'Selecione o tipo de avaliação.' }
  if (!data_realizada) return { erro: 'Informe a data.' }

  const supabase = await criarClienteServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('avaliacoes').insert({
    aluno_id,
    tipo,
    data_realizada,
    observacao,
    registrado_por: user?.id ?? null,
  })
  if (error) return { erro: error.message }

  revalidatePath('/avaliacoes')
  revalidatePath('/')
  return null
}