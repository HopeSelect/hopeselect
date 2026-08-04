import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { TIPOS_AVALIACAO, statusAvaliacao, dataDeslocadaISO } from '@/lib/utils'
import type { LinhaAvaliacaoStatus } from '@/lib/tipos'
import { AvaliacaoForm } from './avaliacao-form'
import { registrarAvaliacao } from './actions'

export default async function AvaliacoesPage() {
  const supabase = await criarClienteServer()

  const [{ data: status, error }, { data: alunos }] = await Promise.all([
    supabase.from('vw_avaliacoes_status').select('*').order('proxima_data', { ascending: true, nullsFirst: true }),
    supabase.from('alunos').select('id, nome').order('nome'),
  ])

  const linhas = (status ?? []) as LinhaAvaliacaoStatus[]
  const emSeteDias = dataDeslocadaISO(7)
  const pendentes = linhas.filter((l) => !l.proxima_data || l.proxima_data <= emSeteDias)
  const emDia = linhas.filter((l) => l.proxima_data && l.proxima_data > emSeteDias)

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="mt-1 text-sm text-gray-500">
          Avaliação coach e nutricional a cada 3 meses; avaliação funcional a cada 6 meses.
        </p>

        {error && <p className="mt-2 text-sm text-red-600">Erro ao carregar: {error.message}</p>}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-900">Pendentes</h2>
            {pendentes.length === 0 && (
              <p className="text-sm text-gray-500">Nenhuma avaliação pendente. 🎉</p>
            )}
            {pendentes.map((l) => {
              const selo = statusAvaliacao(l.proxima_data)
              return (
                <div
                  key={`${l.aluno_id}-${l.tipo}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${selo.classe}`}>
                    {selo.rotulo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {l.aluno_nome}
                      {l.aluno_matricula && <span className="ml-1 font-normal text-gray-400">· {l.aluno_matricula}</span>}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {TIPOS_AVALIACAO[l.tipo]}
                      {l.ultima_avaliacao
                        ? ` · última em ${new Date(`${l.ultima_avaliacao}T00:00:00`).toLocaleDateString('pt-BR')}`
                        : ' · nunca registrada'}
                    </p>
                  </div>
                </div>
              )
            })}

            {emDia.length > 0 && (
              <>
                <h2 className="mt-8 text-sm font-medium text-gray-900">Em dia</h2>
                {emDia.map((l) => {
                  const selo = statusAvaliacao(l.proxima_data)
                  return (
                    <div
                      key={`${l.aluno_id}-${l.tipo}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${selo.classe}`}>
                        {selo.rotulo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{l.aluno_nome}</p>
                        <p className="truncate text-xs text-gray-500">
                          {TIPOS_AVALIACAO[l.tipo]} · próxima em{' '}
                          {l.proxima_data ? new Date(`${l.proxima_data}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </section>

          <aside className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-gray-900">Registrar avaliação</h2>
            <AvaliacaoForm acao={registrarAvaliacao} alunos={alunos ?? []} />
          </aside>
        </div>
      </main>
    </AppShell>
  )
}