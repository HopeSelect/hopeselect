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
    foto_url: valorOuNull(fd.get('foto_url')),
    ultimo_momento_coach: valorOuNull(fd.get('ultimo_momento_coach')),
    // ultima_prescricao não é mais editável por aqui — a prescrição de
    // treino já é bem coberta pelo módulo Tarefas automaticamente, sem
    // precisar de preenchimento manual. Valor antigo fica intacto no banco.
    ultimo_laudo: valorOuNull(fd.get('ultimo_laudo')),
    ultimo_atendimento_nutri: valorOuNull(fd.get('ultimo_atendimento_nutri')),
  }
}
// Nome igual (sem diferenciar maiúscula/minúscula) já cadastrado -> bloqueia.
// idExcluido serve pra não comparar o aluno com ele mesmo ao editar.
async function existeAlunoComMesmoNome(
  supabase: Awaited<ReturnType<typeof criarClienteServer>>,
  nome: string,
  idExcluido?: string,
): Promise<boolean> {
  let query = supabase.from('alunos').select('id').ilike('nome', nome)
  if (idExcluido) query = query.neq('id', idExcluido)
  const { data } = await query.limit(1)
  return (data?.length ?? 0) > 0
}
// Troca o erro cru do banco por uma mensagem que a recepção entende.
function traduzirErro(mensagem: string): string {
  if (mensagem.includes('alunos_matricula_key')) {
    return 'Já existe um aluno cadastrado com essa matrícula. Confere o número antes de salvar de novo.'
  }
  return mensagem
}
export async function criarAluno(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const dados = dadosAluno(fd)
  if (!dados.nome) return { erro: 'Nome é obrigatório.' }
  const supabase = await criarClienteServer()
  if (await existeAlunoComMesmoNome(supabase, dados.nome)) {
    return { erro: `Já existe um aluno cadastrado com o nome "${dados.nome}". Confere se não é duplicado.` }
  }
  const { error } = await supabase.from('alunos').insert(dados)
  if (error) return { erro: traduzirErro(error.message) }
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
  if (await existeAlunoComMesmoNome(supabase, dados.nome, id)) {
    return { erro: `Já existe outro aluno cadastrado com o nome "${dados.nome}".` }
  }
  const { error } = await supabase.from('alunos').update(dados).eq('id', id)
  if (error) return { erro: traduzirErro(error.message) }
  revalidatePath('/alunos')
  redirect('/alunos')
}
export async function excluirAluno(id: string) {
  const supabase = await criarClienteServer()
  await supabase.from('alunos').delete().eq('id', id)
  revalidatePath('/alunos')
}
