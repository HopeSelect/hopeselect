import Link from 'next/link'
import estilos from './professores.module.css'
import { Nav } from '@/components/nav'
import { criarClienteServer } from '@/lib/supabase/server'
import { GENEROS } from '@/lib/utils'
import type { Professor } from '@/lib/tipos'
import { ProfessorForm } from './professor-form'
import { criarProfessor, definirAtivoProfessor } from './actions'

export default async function ProfessoresPage() {
  const supabase = await criarClienteServer()
  const { data, error } = await supabase
    .from('professores')
    .select('*')
    .order('nome')

  const professores = (data ?? []) as Professor[]

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Professores</h1>

        {error && (
          <p className="mt-2 text-sm text-red-600">
            Erro ao carregar: {error.message}
          </p>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Lista */}
          <section className="space-y-2">
            {professores.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum professor cadastrado ainda.</p>
            )}
            {professores.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.foto_url ?? '/window.svg'}
                  alt=""
                  className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {p.nome}
                    {!p.ativo && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        (inativo)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[p.funcao, GENEROS[p.genero], p.horario_trabalho]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Link
                  href={`/professores/${p.id}`}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Editar
                </Link>
                <form action={definirAtivoProfessor.bind(null, p.id, !p.ativo)}>
                  <button className="text-sm text-gray-400 hover:text-gray-900">
                    {p.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </form>
              </div>
            ))}
          </section>

          {/* Novo */}
          <aside className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-gray-900">Novo professor</h2>
            <ProfessorForm acao={criarProfessor} />
          </aside>
        </div>
      </main>
    </>
  )
}
