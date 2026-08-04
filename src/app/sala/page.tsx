import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import { hojeISO } from '@/lib/utils'
import type { AtendimentoAberto, IntervaloAberto, Professor, TarefaDoDia } from '@/lib/tipos'
import { PainelSala } from './painel-sala'
import estilos from './sala.module.css'

export default async function SalaPage() {
  const supabase = await criarClienteServer()
  const [
    { data: professores, error: erroProfessores },
    { data: atendimentos, error: erroAtendimentos },
    { data: intervalos, error: erroIntervalos },
    { data: tarefas, error: erroTarefas },
  ] = await Promise.all([
    supabase
      .from('professores')
      .select('*')
      .eq('ativo', true)
      .eq('em_sala', true)
      .order('nome'),
    supabase
      .from('atendimentos')
      .select('id, aluno_id, professor_id, inicio, tarefa, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes)')
      .is('fim', null),
    supabase.from('lanches').select('id, professor_id, tipo, inicio').is('fim', null),
    supabase
      .from('tarefas')
      .select('id, aluno_id, professor_id, tipo, status, observacao, inicio, fim, alunos(id, nome)')
      .eq('data', hojeISO())
      .neq('status', 'cancelada')
      .order('created_at'),
  ])
  const erro = erroProfessores?.message ?? erroAtendimentos?.message ?? erroIntervalos?.message ?? erroTarefas?.message ?? null
  return (
    <AppShell>
      <main className="flex w-full flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          {erro && <p className="mt-1 text-sm text-red-600">Erro ao carregar: {erro}</p>}
        </div>
        <PainelSala
          professoresIniciais={(professores ?? []) as Professor[]}
          atendimentosIniciais={(atendimentos ?? []) as unknown as AtendimentoAberto[]}
          intervalosIniciais={(intervalos ?? []) as IntervaloAberto[]}
          tarefasIniciais={(tarefas ?? []) as unknown as TarefaDoDia[]}
        />
      </main>
    </AppShell>
  )
}
