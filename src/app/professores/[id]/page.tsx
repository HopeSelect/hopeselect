import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import type { HorarioProfessor, Professor } from '@/lib/tipos'
import { ProfessorForm } from '../professor-form'
import { atualizarProfessor } from '../actions'
import { EscalaProfessor } from './escala-professor'

export default async function EditarProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await criarClienteServer()
  const [{ data }, { data: horarios }] = await Promise.all([
    supabase.from('professores').select('*').eq('id', id).single(),
    supabase.from('professor_horarios').select('*').eq('professor_id', id),
  ])

  if (!data) notFound()
  const professor = data as Professor

  return (
    <AppShell titulo="Editar professor">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <ProfessorForm
            acao={atualizarProfessor.bind(null, professor.id)}
            inicial={professor}
          />
        </div>

        <EscalaProfessor professorId={professor.id} horariosIniciais={(horarios ?? []) as HorarioProfessor[]} />
      </main>
    </AppShell>
  )
}
