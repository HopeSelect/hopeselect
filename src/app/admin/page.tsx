import Link from 'next/link'
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

const POR_PAGINA = 15

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    paginaUsuarios?: string
    paginaAtendimentos?: string
    paginaTarefas?: string
    paginaParecidos?: string
  }>
}) {
  const {
    paginaUsuarios: paginaUsuariosParam,
    paginaAtendimentos: paginaAtendimentosParam,
    paginaTarefas: paginaTarefasParam,
    paginaParecidos: paginaParecidosParam,
  } = await searchParams
  const supabase = await criarClienteServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AppShell titulo="Admin">
        <p className="text-sm text-gray-500 dark:text-gray-400">Sessão expirada.</p>
      </AppShell>
    )
  }

  const { data: meuPerfil } = await supabase.from('perfis').select('papel').eq('id', user.id).single()

  if (meuPerfil?.papel !== 'admin') {
    return (
      <AppShell titulo="Admin">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Essa área é restrita a administradores. Fala com um admin se precisar de acesso.
        </p>
      </AppShell>
    )
  }

  const [{ data: usuarios, error: erroUsuarios }, { data: parecidos }, { data: atendimentosLongos }, { data: tarefasAtrasadas }] =
    await Promise.all([
      supabase.rpc('admin_listar_perfis'),
      supabase.from('vw_admin_alunos_parecidos').select('*'),
      supabase.from('vw_admin_atendimentos_longos').select('*'),
      supabase.from('vw_admin_tarefas_atrasadas').select('*'),
    ])

  const listaUsuarios = (usuarios ?? []) as PerfilComEmail[]
  const listaParecidos = (parecidos ?? []) as AlunoParecido[]
  const listaAtendimentosLongos = (atendimentosLongos ?? []) as AtendimentoLongo[]
  const listaTarefasAtrasadas = (tarefasAtrasadas ?? []) as TarefaAtrasada[]

  const paginaUsuarios = Math.max(1, Number(paginaUsuariosParam ?? '1') || 1)
  const totalPaginasUsuarios = Math.max(1, Math.ceil(listaUsuarios.length / POR_PAGINA))
  const usuariosDaPagina = listaUsuarios.slice((paginaUsuarios - 1) * POR_PAGINA, paginaUsuarios * POR_PAGINA)

  const paginaAtendimentos = Math.max(1, Number(paginaAtendimentosParam ?? '1') || 1)
  const totalPaginasAtendimentos = Math.max(1, Math.ceil(listaAtendimentosLongos.length / POR_PAGINA))
  const atendimentosDaPagina = listaAtendimentosLongos.slice(
    (paginaAtendimentos - 1) * POR_PAGINA,
    paginaAtendimentos * POR_PAGINA,
  )

  const paginaTarefas = Math.max(1, Number(paginaTarefasParam ?? '1') || 1)
  const totalPaginasTarefas = Math.max(1, Math.ceil(listaTarefasAtrasadas.length / POR_PAGINA))
  const tarefasDaPagina = listaTarefasAtrasadas.slice((paginaTarefas - 1) * POR_PAGINA, paginaTarefas * POR_PAGINA)

  const paginaParecidos = Math.max(1, Number(paginaParecidosParam ?? '1') || 1)
  const totalPaginasParecidos = Math.max(1, Math.ceil(listaParecidos.length / POR_PAGINA))
  const parecidosDaPagina = listaParecidos.slice((paginaParecidos - 1) * POR_PAGINA, paginaParecidos * POR_PAGINA)

  // Botão de página genérico — cada tabela usa seu próprio parâmetro na URL,
  // pra trocar de página numa não bagunçar a posição das outras 3.
  function BotoesPagina({ chave, pagina, totalPaginas }: { chave: string; pagina: number; totalPaginas: number }) {
    if (totalPaginas <= 1) return null
    return (
      <div className="mt-3 flex items-center justify-center gap-3">
        <Link
          href={`/admin?${chave}=${pagina - 1}`}
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
          href={`/admin?${chave}=${pagina + 1}`}
          aria-disabled={pagina >= totalPaginas}
          className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium ${
            pagina >= totalPaginas ? 'pointer-events-none text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          Próxima
        </Link>
      </div>
    )
  }

  return (
    <AppShell titulo="Admin">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Painel restrito a administradores — gestão de usuários e saúde dos dados do sistema.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Usuários com acesso <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({listaUsuarios.length})</span>
          </h2>
          {erroUsuarios && <p className="mt-2 text-sm text-red-600">Erro: {erroUsuarios.message}</p>}
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Papel</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {usuariosDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
                {usuariosDaPagina.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{u.nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{u.email ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{u.papel}</td>
                    <td className="px-4 py-2">
                      {u.ativo ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Ativo</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Inativo</span>
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
          <BotoesPagina chave="paginaUsuarios" pagina={paginaUsuarios} totalPaginas={totalPaginasUsuarios} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Atendimentos abertos há muito tempo{' '}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({listaAtendimentosLongos.length})</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mais de 4 horas sem finalizar — pode ser esquecimento.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Aluno</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Aberto há</th>
                </tr>
              </thead>
              <tbody>
                {atendimentosDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nada fora do padrão agora.
                    </td>
                  </tr>
                )}
                {atendimentosDaPagina.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{a.aluno_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{a.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{a.horas_aberto}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BotoesPagina chave="paginaAtendimentos" pagina={paginaAtendimentos} totalPaginas={totalPaginasAtendimentos} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Tarefas atrasadas <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({listaTarefasAtrasadas.length})</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Data já passou e ainda não foi concluída nem cancelada.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Aluno</th>
                  <th className="px-4 py-2">Professor</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tarefasDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhuma tarefa atrasada.
                    </td>
                  </tr>
                )}
                {tarefasDaPagina.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {new Date(`${t.data}T00:00:00`).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{t.aluno_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.professor_nome}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BotoesPagina chave="paginaTarefas" pagina={paginaTarefas} totalPaginas={totalPaginasTarefas} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Alunos com nomes parecidos <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({listaParecidos.length})</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pode ser cadastro duplicado com pequena diferença de digitação.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Aluno 1</th>
                  <th className="px-4 py-2">Aluno 2</th>
                  <th className="px-4 py-2">Parecido</th>
                </tr>
              </thead>
              <tbody>
                {parecidosDaPagina.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Nenhum nome parecido encontrado.
                    </td>
                  </tr>
                )}
                {parecidosDaPagina.map((p) => (
                  <tr key={`${p.id_a}-${p.id_b}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{p.nome_a}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{p.nome_b}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{Math.round(p.parecido * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BotoesPagina chave="paginaParecidos" pagina={paginaParecidos} totalPaginas={totalPaginasParecidos} />
        </section>
      </div>
    </AppShell>
  )
}