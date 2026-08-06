import { AppShell } from '@/components/app-shell'
import Link from 'next/link'
import { criarClienteServer } from '@/lib/supabase/server'
import { TIPOS_AVALIACAO, statusAvaliacao, dataDeslocadaISO } from '@/lib/utils'
import type { LinhaAvaliacaoStatus } from '@/lib/tipos'
import { AvaliacaoForm } from './avaliacao-form'
import { registrarAvaliacao } from './actions'

const POR_PAGINA = 15

export default async function AvaliacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ paginaPendentes?: string; paginaEmDia?: string }>
}) {
  const { paginaPendentes: paginaPendentesParam, paginaEmDia: paginaEmDiaParam } = await searchParams
  const supabase = await criarClienteServer()

  const [{ data: status, error }, { data: alunos }] = await Promise.all([
    supabase.from('vw_avaliacoes_status').select('*').order('proxima_data', { ascending: true, nullsFirst: true }),
    supabase.from('alunos').select('id, nome').order('nome'),
  ])

  const linhas = (status ?? []) as LinhaAvaliacaoStatus[]
  const emSeteDias = dataDeslocadaISO(7)
  const pendentes = linhas.filter((l) => !l.proxima_data || l.proxima_data <= emSeteDias)
  const emDia = linhas.filter((l) => l.proxima_data && l.proxima_data > emSeteDias)

  const paginaPendentes = Math.max(1, Number(paginaPendentesParam ?? '1') || 1)
  const totalPaginasPendentes = Math.max(1, Math.ceil(pendentes.length / POR_PAGINA))
  const pendentesDaPagina = pendentes.slice((paginaPendentes - 1) * POR_PAGINA, paginaPendentes * POR_PAGINA)

  const paginaEmDia = Math.max(1, Number(paginaEmDiaParam ?? '1') || 1)
  const totalPaginasEmDia = Math.max(1, Math.ceil(emDia.length / POR_PAGINA))
  const emDiaDaPagina = emDia.slice((paginaEmDia - 1) * POR_PAGINA, paginaEmDia * POR_PAGINA)

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="mt-1 text-sm text-gray-500">
          Avaliação coach e nutricional a cada 3 meses; avaliação funcional a cada 6 meses.
        </p>

        {error && <p className="mt-2 text-sm text-red-600">Erro ao carregar: {error.message}</p>}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-900">
              Pendentes <span className="text-xs font-normal text-gray-400">({pendentes.length} no total)</span>
            </h2>
            {pendentes.length === 0 && (
              <p className="text-sm text-gray-500">Nenhuma avaliação pendente. 🎉</p>
            )}
            {pendentesDaPagina.map((l) => {
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

            {totalPaginasPendentes > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href={`/avaliacoes?paginaPendentes=${paginaPendentes - 1}`}
                  aria-disabled={paginaPendentes <= 1}
                  className={`rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium ${
                    paginaPendentes <= 1 ? 'pointer-events-none text-gray-300' : 'text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Anterior
                </Link>
                <span className="text-sm text-gray-500">
                  Página {paginaPendentes} de {totalPaginasPendentes}
                </span>
                <Link
                  href={`/avaliacoes?paginaPendentes=${paginaPendentes + 1}`}
                  aria-disabled={paginaPendentes >= totalPaginasPendentes}
                  className={`rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium ${
                    paginaPendentes >= totalPaginasPendentes
                      ? 'pointer-events-none text-gray-300'
                      : 'text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Próxima
                </Link>
              </div>
            )}

            {emDia.length > 0 && (
              <>
                <h2 className="mt-8 text-sm font-medium text-gray-900">
                  Em dia <span className="text-xs font-normal text-gray-400">({emDia.length} no total)</span>
                </h2>
                {emDiaDaPagina.map((l) => {
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

                {totalPaginasEmDia > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Link
                      href={`/avaliacoes?paginaEmDia=${paginaEmDia - 1}`}
                      aria-disabled={paginaEmDia <= 1}
                      className={`rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium ${
                        paginaEmDia <= 1 ? 'pointer-events-none text-gray-300' : 'text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Anterior
                    </Link>
                    <span className="text-sm text-gray-500">
                      Página {paginaEmDia} de {totalPaginasEmDia}
                    </span>
                    <Link
                      href={`/avaliacoes?paginaEmDia=${paginaEmDia + 1}`}
                      aria-disabled={paginaEmDia >= totalPaginasEmDia}
                      className={`rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium ${
                        paginaEmDia >= totalPaginasEmDia
                          ? 'pointer-events-none text-gray-300'
                          : 'text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Próxima
                    </Link>
                  </div>
                )}
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