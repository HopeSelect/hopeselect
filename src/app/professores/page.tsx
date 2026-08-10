import Link from 'next/link'
import estilos from './professores.module.css'
import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { GENEROS, formatarEscalaResumo } from '@/lib/utils'
import type { HorarioProfessor, Professor } from '@/lib/tipos'
import { ProfessorForm } from './professor-form'
import { criarProfessor } from './actions'
import { ExcluirProfessorBotao } from './excluir-professor-botao'
import { DefinirAtivoProfessorBotao } from './definir-ativo-professor-botao'

const POR_PAGINA = 15

export default async function ProfessoresPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>
}) {
  const { pagina: paginaParam } = await searchParams
  const pagina = Math.max(1, Number(paginaParam ?? '1') || 1)
  const de = (pagina - 1) * POR_PAGINA
  const ate = de + POR_PAGINA - 1

  const supabase = await criarClienteServer()
  const { data, error, count } = await supabase
    .from('professores')
    .select('*', { count: 'exact' })
    .order('nome')
    .range(de, ate)
  const professores = (data ?? []) as Professor[]
  const total = count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  // Só busca a escala dos professores desta página, não de todos os
  // cadastrados — evita carregar dado que não vai aparecer na tela.
  const idsDaPagina = professores.map((p) => p.id)
  const { data: horariosDaPagina } =
    idsDaPagina.length > 0
      ? await supabase.from('professor_horarios').select('*').in('professor_id', idsDaPagina)
      : { data: [] }
  const horariosPorProfessor = new Map<string, HorarioProfessor[]>()
  for (const h of (horariosDaPagina ?? []) as HorarioProfessor[]) {
    const lista = horariosPorProfessor.get(h.professor_id) ?? []
    lista.push(h)
    horariosPorProfessor.set(h.professor_id, lista)
  }

  function linkPagina(p: number) {
    return `/professores?pagina=${p}`
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} professor{total === 1 ? '' : 'es'} cadastrado{total === 1 ? '' : 's'}
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600">
            Erro ao carregar: {error.message}
          </p>
        )}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Lista */}
          <section className="space-y-2">
            {professores.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum professor cadastrado ainda.</p>
            )}
            {professores.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.foto_url ?? '/window.svg'}
                  alt=""
                  className="h-10 w-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {p.nome}
                    {!p.ativo && (
                      <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                        (inativo)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {[p.funcao, GENEROS[p.genero], formatarEscalaResumo(horariosPorProfessor.get(p.id) ?? [])]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Link
                  href={`/professores/${p.id}`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Editar
                </Link>
                <DefinirAtivoProfessorBotao id={p.id} ativo={p.ativo} />
                <ExcluirProfessorBotao id={p.id} nome={p.nome} />
              </div>
            ))}

            {totalPaginas > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  href={linkPagina(pagina - 1)}
                  aria-disabled={pagina <= 1}
                  className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                    pagina <= 1 ? 'pointer-events-none text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  Anterior
                </Link>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Página {pagina} de {totalPaginas}
                </span>
                <Link
                  href={linkPagina(pagina + 1)}
                  aria-disabled={pagina >= totalPaginas}
                  className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
                    pagina >= totalPaginas ? 'pointer-events-none text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  Próxima
                </Link>
              </div>
            )}
          </section>
          {/* Novo */}
          <aside className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 className="mb-4 font-medium text-gray-900 dark:text-gray-100">Novo professor</h2>
            <ProfessorForm acao={criarProfessor} />
          </aside>
        </div>
      </main>
    </AppShell>
  )
}
