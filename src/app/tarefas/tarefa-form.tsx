'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Tarefa, TipoTarefa } from '@/lib/tipos'
import { TIPOS_TAREFA } from '@/lib/utils'
import type { EstadoForm } from './actions'

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>

type OpcaoNome = { id: string; nome: string }

const campo =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

// Data de amanhã em formato yyyy-mm-dd, já que o líder lança um dia antes (fluxo do cliente).
function amanhaISO() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10)
}

export function TarefaForm({
  acao,
  alunos,
  professores,
  inicial,
}: {
  acao: Acao
  alunos: OpcaoNome[]
  professores: OpcaoNome[]
  inicial?: Tarefa
}) {
  const [estado, submit, pendente] = useActionState(acao, null)

  return (
    <form action={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Aluno *
          <select name="aluno_id" required defaultValue={inicial?.aluno_id ?? ''} className={campo}>
            <option value="" disabled>
              Selecione…
            </option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Professor *
          <select
            name="professor_id"
            required
            defaultValue={inicial?.professor_id ?? ''}
            className={campo}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Tipo
          <select name="tipo" defaultValue={inicial?.tipo ?? 'prescricao'} className={campo}>
            {(Object.keys(TIPOS_TAREFA) as TipoTarefa[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_TAREFA[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Data *
          <input
            type="date"
            name="data"
            required
            defaultValue={inicial?.data ?? amanhaISO()}
            className={campo}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Observação
        <textarea
          name="observacao"
          rows={2}
          defaultValue={inicial?.observacao ?? ''}
          className={campo}
        />
      </label>

      {estado?.erro && (
        <p className="text-sm text-red-600" role="alert">
          {estado.erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {pendente ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/tarefas" className="text-sm text-gray-500 hover:text-gray-900">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
