'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Professor } from '@/lib/tipos'
import { GENEROS } from '@/lib/utils'
import { FotoProfessor } from './foto-professor'
import type { EstadoForm } from './actions'

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>

const campo =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

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
      <label className="block text-sm font-medium text-gray-700">
        Nome *
        <input name="nome" required defaultValue={inicial?.nome} className={campo} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Função
          <input name="funcao" defaultValue={inicial?.funcao ?? ''} className={campo} />
        </label>

        <label className="block text-sm font-medium text-gray-700">
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

      <label className="block text-sm font-medium text-gray-700">
        Horário de trabalho
        <input
          name="horario_trabalho"
          defaultValue={inicial?.horario_trabalho ?? ''}
          placeholder="ex.: 06h–14h"
          className={campo}
        />
      </label>

      <div className="text-sm font-medium text-gray-700">
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
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {pendente ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/professores" className="text-sm text-gray-500 hover:text-gray-900">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
