import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
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
    <AppShell titulo="Editar professor">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <ProfessorForm
            acao={atualizarProfessor.bind(null, professor.id)}
            inicial={professor}
          />
        </div>
      </main>
    </AppShell>
  )
}
