import { notFound, redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { criarClienteServer } from '@/lib/supabase/server'
import type { Aluno } from '@/lib/tipos'
import { AlunoForm } from '../aluno-form'
import { atualizarAluno, excluirAluno } from '../actions'

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await criarClienteServer()
  const { data } = await supabase.from('alunos').select('*').eq('id', id).single()

  if (!data) notFound()
  const aluno = data as Aluno

  async function remover() {
    'use server'
    await excluirAluno(id)
    redirect('/alunos')
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Editar aluno</h1>
          <form action={remover}>
            <button className="text-sm text-red-600 hover:text-red-800">Excluir</button>
          </form>
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <AlunoForm acao={atualizarAluno.bind(null, aluno.id)} inicial={aluno} />
        </div>
      </main>
    </>
  )
}
