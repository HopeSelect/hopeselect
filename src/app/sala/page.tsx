import { Nav } from '@/components/nav'
import { criarClienteServer } from '@/lib/supabase/server'
import type { AtendimentoAberto, IntervaloAberto, Professor } from '@/lib/tipos'
import { PainelSala } from './painel-sala'

export default async function SalaPage() {
  const supabase = await criarClienteServer()

  const [
    { data: professores, error: erroProfessores },
    { data: atendimentos, error: erroAtendimentos },
    { data: intervalos, error: erroIntervalos },
  ] = await Promise.all([
    supabase
      .from('professores')
      .select('*')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('atendimentos')
      .select('id, aluno_id, professor_id, inicio, alunos(id, nome, classificacao, alertas, ultimo_acesso)')
      .is('fim', null),
    supabase.from('lanches').select('id, professor_id, tipo, inicio').is('fim', null),
  ])

  const erro = erroProfessores?.message ?? erroAtendimentos?.message ?? erroIntervalos?.message ?? null

  return (
    <>
      <Nav />
      <main className="flex w-full flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <h1 className="text-xl font-semibold text-gray-900">Painel de sala</h1>
          {erro && <p className="mt-1 text-sm text-red-600">Erro ao carregar: {erro}</p>}
        </div>
        <PainelSala
          professoresIniciais={(professores ?? []) as Professor[]}
          atendimentosIniciais={(atendimentos ?? []) as unknown as AtendimentoAberto[]}
          intervalosIniciais={(intervalos ?? []) as IntervaloAberto[]}
        />
      </main>
    </>
  )
}
