'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Professor } from '@/lib/tipos'
import { GENEROS } from '@/lib/utils'
import { FotoProfessor } from './foto-professor'
import type { EstadoForm } from './actions'

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>

const campo =
  'mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm outline-none focus:border-gray-900 dark:focus:border-brand-400'

export function ProfessorForm({
  acao,
  inicial,
}: {
  acao: Acao
  inicial?: Professor
}) {
  const [estado, submit, pendente] = useActionState(acao, null)

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Nome *
        <input name="nome" required defaultValue={inicial?.nome} className={campo} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Função
          <input name="funcao" defaultValue={inicial?.funcao ?? ''} className={campo} />
        </label>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Gênero
          <select
            name="genero"
            defaultValue={inicial?.genero ?? 'outro'}
            className={campo}
          >
            {Object.entries(GENEROS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Foto
        <div className="mt-1">
          <FotoProfessor inicial={inicial?.foto_url} />
        </div>
      </div>

      {estado?.erro && (
        <p className="text-sm text-red-600" role="alert">
          {estado.erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-gray-900 dark:bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-brand-600 disabled:opacity-60"
        >
          {pendente ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/professores" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
