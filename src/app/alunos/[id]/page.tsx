import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { statusAlertaAluno, TIPOS_ALERTA_ALUNO } from '@/lib/utils'
import type { Aluno, LinhaAlertaAlunoStatus, TipoAlertaAluno } from '@/lib/tipos'
import { AlunoForm } from '../aluno-form'
import { atualizarAluno, excluirAluno } from '../actions'

const ORDEM_ALERTAS: TipoAlertaAluno[] = ['prescricao', 'laudo', 'nutri']

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await criarClienteServer()

  const [{ data }, { data: professores }, { data: alertas }, { data: momentoCoach }] = await Promise.all([
    supabase.from('alunos').select('*').eq('id', id).single(),
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('vw_alertas_aluno_status').select('*').eq('aluno_id', id),
    supabase.from('vw_ultimo_momento_coach').select('ultima_data').eq('aluno_id', id).maybeSingle(),
  ])

  if (!data) notFound()
  const aluno = data as Aluno
  const listaAlertas = (alertas ?? []) as LinhaAlertaAlunoStatus[]

  async function remover() {
    'use server'
    await excluirAluno(id)
    redirect('/alunos')
  }

  return (
    <AppShell titulo="Editar aluno">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex items-center justify-end">
          <form action={remover}>
            <button className="text-sm text-red-600 hover:text-red-800">Excluir</button>
          </form>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">Acompanhamento</h2>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
              <span className="text-gray-700 dark:text-gray-300">Último momento coach</span>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {momentoCoach?.ultima_data
                  ? new Date(`${momentoCoach.ultima_data}T00:00:00`).toLocaleDateString('pt-BR')
                  : 'Nunca realizado'}
              </span>
            </div>
            {ORDEM_ALERTAS.map((tipo) => {
              const linha = listaAlertas.find((a) => a.tipo === tipo)
              const selo = statusAlertaAluno(linha?.proxima_data ?? null)
              return (
                <div key={tipo} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{TIPOS_ALERTA_ALUNO[tipo]}</span>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-xs font-medium ${selo.classe}`}>
                    {selo.rotulo}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Prazo de 60 dias entre uma prescrição/laudo/atendimento com a nutricionista e o próximo.</p>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <AlunoForm acao={atualizarAluno.bind(null, aluno.id)} professores={professores ?? []} inicial={aluno} />
        </div>
      </main>
    </AppShell>
  )
}
