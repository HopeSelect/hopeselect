import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import type { AtendimentoNutriAberto, Nutricionista } from '@/lib/tipos'
import { NutricionistaForm } from './nutricionista-form'
import { PainelNutri } from './painel-nutri'
import { definirAtivoNutricionista } from './actions'

export default async function NutriPage() {
  const supabase = await criarClienteServer()

  const [
    { data: nutricionistas, error: erroNutri },
    { data: atendimentos, error: erroAtendimentos },
    { data: todosNutricionistas },
  ] = await Promise.all([
    supabase.from('nutricionistas').select('*').eq('ativo', true).order('nome'),
    supabase
      .from('atendimentos_nutricionista')
      .select(
        'id, aluno_id, nutricionista_id, inicio, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes, foto_url)',
      )
      .is('fim', null),
    supabase.from('nutricionistas').select('*').order('nome'),
  ])

  const erro = erroNutri?.message ?? erroAtendimentos?.message ?? null
  const todas = (todosNutricionistas ?? []) as Nutricionista[]

  return (
    <AppShell>
      <div className="flex w-full flex-1 flex-col lg:flex-row">
        <div className="flex-1">
          <div className="border-b border-gray-200 bg-white px-4 py-3">
            {erro && <p className="text-sm text-red-600">Erro ao carregar: {erro}</p>}
          </div>
          <PainelNutri
            nutricionistasIniciais={(nutricionistas ?? []) as Nutricionista[]}
            atendimentosIniciais={(atendimentos ?? []) as unknown as AtendimentoNutriAberto[]}
          />
        </div>

        <aside className="w-full shrink-0 border-t border-gray-200 bg-white p-5 lg:w-80 lg:border-l lg:border-t-0">
          <h2 className="mb-4 font-medium text-gray-900">Nova nutricionista</h2>
          <NutricionistaForm />

          {todas.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 font-medium text-gray-900">Cadastradas</h2>
              <div className="space-y-2">
                {todas.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 p-2 text-sm">
                    <span className={n.ativo ? 'text-gray-900' : 'text-gray-400'}>
                      {n.nome}
                      {!n.ativo && ' (inativa)'}
                    </span>
                    <form action={definirAtivoNutricionista.bind(null, n.id, !n.ativo)}>
                      <button className="text-xs text-gray-500 hover:text-gray-900">
                        {n.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  )
}
