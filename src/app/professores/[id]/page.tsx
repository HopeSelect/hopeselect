import { notFound } from 'next/navigation'
import { Nav } from '@/components/nav'
import { criarClienteServer } from '@/lib/supabase/server'
import type { Professor } from '@/lib/tipos'
import { ProfessorForm } from '../professor-form'
import { atualizarProfessor } from '../actions'

export default async function EditarProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await criarClienteServer()
  const { data } = await supabase
    .from('professores')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) notFound()
  const professor = data as Professor

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Editar professor</h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <ProfessorForm
            acao={atualizarProfessor.bind(null, professor.id)}
            inicial={professor}
          />
        </div>
      </main>
    </>
  )
}
