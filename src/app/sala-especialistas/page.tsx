import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import type { Especialista } from '@/lib/tipos'
import { PainelSalaEspecialistas, type AtendimentoEspecialistaAberto } from './painel-sala-especialistas'

export default async function SalaEspecialistasPage() {
  const supabase = await criarClienteServer()

  const [
    { data: especialistas, error: erroEspecialistas },
    { data: atendimentos, error: erroAtendimentos },
  ] = await Promise.all([
    supabase
      .from('especialistas')
      .select('*')
      .eq('ativo', true)
      .eq('em_sala', true)
      .order('nome'),
    supabase
      .from('atendimentos_especialista')
      .select('id, aluno_id, especialista_id, inicio, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes, foto_url)')
      .is('fim', null),
  ])

  const erro = erroEspecialistas?.message ?? erroAtendimentos?.message ?? null

  return (
    <AppShell titulo="Sala — Especialistas">
      <main className="flex w-full flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          {erro && <p className="mt-1 text-sm text-red-600">Erro ao carregar: {erro}</p>}
        </div>
        <PainelSalaEspecialistas
          especialistasIniciais={(especialistas ?? []) as Especialista[]}
          atendimentosIniciais={(atendimentos ?? []) as unknown as AtendimentoEspecialistaAberto[]}
        />
      </main>
    </AppShell>
  )
}