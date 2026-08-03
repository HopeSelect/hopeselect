import { AppShell } from '@/components/app-shell'
import { criarClienteServer } from '@/lib/supabase/server'
import type { Papel } from '@/lib/tipos'
import { GerenciarUsuarioBotoes } from './gerenciar-usuario-botoes'

interface PerfilComEmail {
  id: string
  nome: string
  papel: Papel
  ativo: boolean
  created_at: string
  email: string | null
}

interface AlunoParecido {
  id_a: string
  nome_a: string
  id_b: string
  nome_b: string
  parecido: number
}

interface AtendimentoLongo {
  id: string
  inicio: string
  aluno_nome: string
  professor_nome: string
  horas_aberto: number
}

interface TarefaAtrasada {
  id: string
  data: string
  tipo: string
  status: string
  aluno_nome: string
  professor_nome: string
}

export default async function AdminPage() {
  const supabase = await criarClienteServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AppShell titulo="Admin">
        <p className="text-sm text-gray-500">Sessão expirada.</p>
      </AppShell>
    )
  }

  const { data: meuPerfil } = await supabase.from('perfis').select('papel').eq('id', user.id).single()

  if (meuPerfil?.papel !== 'admin') {
    return (
      <AppShell titulo="Admin">
        <p className="text-sm text-gray-500">
          Essa área é restrita a administradores. Fala com um admin se precisar de acesso.
        </p>
      </AppShell>
    )
  }

  const [{ data: usuarios, error: erroUsuarios }, { data: parecidos }, { data: atendimentosLongos }, { data: tarefasAtrasadas }] =
    await Promise.all([
      supabase.rpc('admin_listar_perfis'),
      supabase.from('vw_admin_alunos_parecidos').select('*').limit(20),
      supabase.from('vw_admin_atendimentos_longos').select('*'),
      supabase.from('vw_admin_tarefas_atrasadas').select('*').limit(30),
    ])

  const listaUsuarios = (usuarios ?? []) as PerfilComEmail[]
  const listaParecidos = (parecidos ?? []) as AlunoParecido[]
  const listaAtendimentosLongos = (atendimentosLongos ?? []) as AtendimentoLongo[]
  const listaTarefasAtrasadas = (tarefasAtrasadas ?? []) as TarefaAtrasada[]

  return (
    <AppShell titulo="Admin">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-sm text-gray-500">
          Painel restrito a administradores — gestão de usuários e saúde dos dados do sistema.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Usuários com acesso</h2>
          {erroUsuarios && <p className="mt-2 text-sm text-red-600">Erro: {erroUsuarios.message}</p>}
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Papel</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {listaUsuarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
                {listaUsuarios.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-900">{u.nome}</td>
                    <td className="px-4 py-2 text-gray-600">{u.email ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{u.papel}</td>
                    <td className="px-4 py-2">
                      {u.ativo ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Ativo</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inativo</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <GerenciarUsuarioBotoes usuario={u} souEuMesmo={u.id === user.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Atendimentos abertos há muito tempo</h2>
          <p className="mt-1 text-sm text-gray-500">Mais de 4 horas sem finalizar — pode ser esquecimento.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Aluno</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Aberto há</th>
                </tr>
              </thead>
              <tbody>
                {listaAtendimentosLongos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                      Nada fora do padrão agora.
                    </td>
                  </tr>
                )}
                {listaAtendimentosLongos.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-900">{a.aluno_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{a.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{a.horas_aberto}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Tarefas atrasadas</h2>
          <p className="mt-1 text-sm text-gray-500">Data já passou e ainda não foi concluída nem cancelada.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Aluno</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {listaTarefasAtrasadas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      Nenhuma tarefa atrasada.
                    </td>
                  </tr>
                )}
                {listaTarefasAtrasadas.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(`${t.data}T00:00:00`).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{t.aluno_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{t.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Alunos com nomes parecidos</h2>
          <p className="mt-1 text-sm text-gray-500">Pode ser cadastro duplicado com pequena diferença de digitação.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Aluno 1</th>
                  <th className="px-4 py-2">Aluno 2</th>
                  <th className="px-4 py-2">Parecido</th>
                </tr>
              </thead>
              <tbody>
                {listaParecidos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                      Nenhum nome parecido encontrado.
                    </td>
                  </tr>
                )}
                {listaParecidos.map((p) => (
                  <tr key={`${p.id_a}-${p.id_b}`} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-900">{p.nome_a}</td>
                    <td className="px-4 py-2 text-gray-900">{p.nome_b}</td>
                    <td className="px-4 py-2 text-gray-600">{Math.round(p.parecido * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  )
}