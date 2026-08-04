import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { TIPOS_ESPECIALISTA } from '@/lib/utils'
import type { Especialista } from '@/lib/tipos'
import { EspecialistaForm } from './especialista-form'
import { criarEspecialista, definirAtivoEspecialista } from './actions'

export default async function EspecialistasPage() {
  const supabase = await criarClienteServer()
  const { data, error } = await supabase.from('especialistas').select('*').order('nome')

  const especialistas = (data ?? []) as Especialista[]

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="mt-1 text-sm text-gray-500">Nutricionistas e fisioterapeutas.</p>

        {error && <p className="mt-2 text-sm text-red-600">Erro ao carregar: {error.message}</p>}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-2">
            {especialistas.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum especialista cadastrado ainda.</p>
            )}
            {especialistas.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.foto_url ?? '/window.svg'}
                  alt=""
                  className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {e.nome}
                    {!e.ativo && <span className="ml-2 text-xs font-normal text-gray-400">(inativo)</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[TIPOS_ESPECIALISTA[e.tipo], e.horario_trabalho].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <form action={definirAtivoEspecialista.bind(null, e.id, !e.ativo)}>
                  <button className="text-sm text-gray-400 hover:text-gray-900">
                    {e.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </form>
              </div>
            ))}
          </section>

          <aside className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-gray-900">Novo especialista</h2>
            <EspecialistaForm acao={criarEspecialista} />
          </aside>
        </div>
      </main>
    </AppShell>
  )
}