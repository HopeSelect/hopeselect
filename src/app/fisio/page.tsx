import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import type { AtendimentoFisioAberto, Fisioterapeuta } from '@/lib/tipos'
import { FisioterapeutaForm } from './fisioterapeuta-form'
import { PainelFisio } from './painel-fisio'
import { definirAtivoFisioterapeuta } from './actions'

export default async function FisioPage() {
  const supabase = await criarClienteServer()

  const [
    { data: fisioterapeutas, error: erroFisio },
    { data: atendimentos, error: erroAtendimentos },
    { data: todosFisioterapeutas },
  ] = await Promise.all([
    supabase.from('fisioterapeutas').select('*').eq('ativo', true).order('nome'),
    supabase
      .from('atendimentos_fisioterapeuta')
      .select(
        'id, aluno_id, fisioterapeuta_id, inicio, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes, foto_url)',
      )
      .is('fim', null),
    supabase.from('fisioterapeutas').select('*').order('nome'),
  ])

  const erro = erroFisio?.message ?? erroAtendimentos?.message ?? null
  const todos = (todosFisioterapeutas ?? []) as Fisioterapeuta[]

  return (
    <AppShell>
      <div className="flex w-full flex-1 flex-col lg:flex-row">
        <div className="flex-1">
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
            {erro && <p className="text-sm text-red-600">Erro ao carregar: {erro}</p>}
          </div>
          <PainelFisio
            fisioterapeutasIniciais={(fisioterapeutas ?? []) as Fisioterapeuta[]}
            atendimentosIniciais={(atendimentos ?? []) as unknown as AtendimentoFisioAberto[]}
          />
        </div>

        <aside className="w-full shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 lg:w-80 lg:border-l lg:border-t-0">
          <h2 className="mb-4 font-medium text-gray-900 dark:text-gray-100">Novo fisioterapeuta</h2>
          <FisioterapeutaForm />

          {todos.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Cadastrados</h2>
              <div className="space-y-2">
                {todos.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-700 p-2 text-sm">
                    <span className={f.ativo ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                      {f.nome}
                      {!f.ativo && ' (inativo)'}
                    </span>
                    <form action={definirAtivoFisioterapeuta.bind(null, f.id, !f.ativo)}>
                      <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                        {f.ativo ? 'Desativar' : 'Ativar'}
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
