'use client'

import { useActionState } from 'react'
import type { TipoAvaliacao } from '@/lib/tipos'
import { TIPOS_AVALIACAO, hojeISO } from '@/lib/utils'
import type { EstadoForm } from './actions'

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>
type OpcaoNome = { id: string; nome: string }

const campo =
  'mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm outline-none focus:border-gray-900 dark:focus:border-brand-400'

export function AvaliacaoForm({ acao, alunos }: { acao: Acao; alunos: OpcaoNome[] }) {
  const [estado, submit, pendente] = useActionState(acao, null)

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Aluno *
        <select name="aluno_id" required defaultValue="" className={campo}>
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

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Tipo *
        <select name="tipo" required defaultValue="" className={campo}>
          <option value="" disabled>
            Selecione…
          </option>
          {(Object.keys(TIPOS_AVALIACAO) as TipoAvaliacao[]).map((t) => (
            <option key={t} value={t}>
              {TIPOS_AVALIACAO[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Data realizada *
        <input type="date" name="data_realizada" required defaultValue={hojeISO()} className={campo} />
      </label>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Observação
        <textarea name="observacao" rows={2} className={campo} />
      </label>

      {estado?.erro && (
        <p className="text-sm text-red-600" role="alert">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-md bg-gray-900 dark:bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-brand-600 disabled:opacity-60"
      >
        {pendente ? 'Salvando…' : 'Registrar'}
      </button>
    </form>
  )
}