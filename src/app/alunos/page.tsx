import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import estilos from './alunos.module.css'
import { criarClienteServer } from '@/lib/supabase/server'
import { CLASSIFICACOES, diasDesde } from '@/lib/utils'
import type { Aluno } from '@/lib/tipos'

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const busca = (q ?? '').trim()

  const supabase = await criarClienteServer()
  let query = supabase.from('alunos').select('*').order('nome').limit(50)
  if (busca) query = query.ilike('nome', `%${busca}%`)
  const { data, error } = await query

  const alunos = (data ?? []) as Aluno[]

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="flex items-center justify-end">
          <Link
            href="/alunos/novo"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Novo aluno
          </Link>
        </div>

        <form className="mt-4">
          <input
            name="q"
            defaultValue={busca}
            placeholder="Buscar por nome…"
            className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </form>

        {error && (
          <p className="mt-2 text-sm text-red-600">Erro ao carregar: {error.message}</p>
        )}

        <div className="mt-6 space-y-2">
          {alunos.length === 0 && (
            <p className="text-sm text-gray-500">
              {busca ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado ainda.'}
            </p>
          )}
          {alunos.map((a) => {
            const dias = diasDesde(a.ultimo_acesso)
            return (
              <Link
                key={a.id}
                href={`/alunos/${a.id}`}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-400"
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${CLASSIFICACOES[a.classificacao].classe}`}
                  title={CLASSIFICACOES[a.classificacao].rotulo}
                >
                  {a.classificacao}
                </span>
                <span className="font-medium text-gray-900">{a.nome}</span>

                {a.alertas.map((alerta) => (
                  <span
                    key={alerta}
                    className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                  >
                    {alerta}
                  </span>
                ))}

                <span className="ml-auto text-xs text-gray-500">
                  {dias === null ? 'sem registro de acesso' : `Acesso há ${dias} dia(s)`}
                </span>
              </Link>
            )
          })}
        </div>
      </main>
    </AppShell>
  )
}
