'use client'

import { useEffect, useState } from 'react'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES, TIPOS_TAREFA, diasDesde } from '@/lib/utils'
import type { AlunoResumo, Professor, TipoTarefa } from '@/lib/tipos'
import { alocarAluno } from './actions'

export function BuscarAluno({
  professor,
  onFechar,
  onAlocado,
}: {
  professor: Professor
  onFechar: () => void
  onAlocado: (alunoId: string, alunoResumo: AlunoResumo, tarefa: TipoTarefa | null) => void
}) {
  const supabase = criarClienteBrowser()
  const [termo, setTermo] = useState('')
  const [tarefa, setTarefa] = useState<TipoTarefa | ''>('')
  const [resultados, setResultados] = useState<AlunoResumo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [alocandoId, setAlocandoId] = useState<string | null>(null)

  // Carrega a lista assim que o painel abre — todos os alunos por padrão
  // (dá pra rolar o mouse e escolher), ou filtrados pelo termo digitado.
  useEffect(() => {
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(async () => {
      let query = supabase
        .from('alunos')
        .select('id, nome, classificacao, alertas, ultimo_acesso, restricoes')
        .order('nome')
        .limit(200)
      if (termo.trim().length >= 1) query = query.ilike('nome', `%${termo.trim()}%`)
      const { data, error } = await query
      if (!cancelado) {
        if (error) setErro(error.message)
        setResultados((data ?? []) as AlunoResumo[])
        setBuscando(false)
      }
    }, 200)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [termo, supabase])

  async function alocar(aluno: AlunoResumo) {
    setAlocandoId(aluno.id)
    setErro(null)
    const tarefaEscolhida = tarefa === '' ? null : tarefa
    const resultado = await alocarAluno(aluno.id, professor.id, tarefaEscolhida)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setAlocandoId(null)
      return
    }
    onAlocado(aluno.id, aluno, tarefaEscolhida)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Alocar aluno em {professor.nome}
          </h2>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <select
            value={tarefa}
            onChange={(e) => setTarefa(e.target.value as TipoTarefa | '')}
            className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          >
            <option value="">Tarefa deste atendimento (opcional)</option>
            {(Object.keys(TIPOS_TAREFA) as TipoTarefa[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_TAREFA[t]}
              </option>
            ))}
          </select>

          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Digite o nome do aluno ou role a lista abaixo…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />

          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
          {buscando && <p className="mt-3 text-sm text-gray-400">Buscando…</p>}

          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {resultados.map((aluno) => {
              const dias = diasDesde(aluno.ultimo_acesso)
              return (
                <li key={aluno.id}>
                  <button
                    onClick={() => alocar(aluno)}
                    disabled={alocandoId !== null}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-left hover:border-gray-400 disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{aluno.nome}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[aluno.classificacao].classe}`}
                      >
                        {aluno.classificacao}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                      {dias !== null && <span>Acesso há {dias} dia{dias === 1 ? '' : 's'}</span>}
                      {aluno.alertas?.map((a) => (
                        <span
                          key={a}
                          className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-800"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                    {alocandoId === aluno.id && (
                      <span className="mt-1 block text-xs text-gray-400">Alocando…</span>
                    )}
                  </button>
                </li>
              )
            })}
            {!buscando && resultados.length === 0 && (
              <li className="text-sm text-gray-400">Nenhum aluno encontrado.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
