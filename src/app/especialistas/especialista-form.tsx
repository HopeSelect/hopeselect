'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Especialista, TipoEspecialista } from '@/lib/tipos'
import { TIPOS_ESPECIALISTA } from '@/lib/utils'
import type { EstadoForm } from './actions'
import { FotoEspecialista } from './foto-especialista'

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>

const campo =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

export function EspecialistaForm({ acao, inicial }: { acao: Acao; inicial?: Especialista }) {
  const [estado, submit, pendente] = useActionState(acao, null)

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Foto
        <div className="mt-1">
          <FotoEspecialista inicial={inicial?.foto_url} />
        </div>
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Nome *
        <input name="nome" required defaultValue={inicial?.nome} className={campo} />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Tipo
        <select name="tipo" defaultValue={inicial?.tipo ?? 'nutricionista'} className={campo}>
          {(Object.keys(TIPOS_ESPECIALISTA) as TipoEspecialista[]).map((t) => (
            <option key={t} value={t}>
              {TIPOS_ESPECIALISTA[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Horário de trabalho
        <input
          name="horario_trabalho"
          placeholder="Ex: 08:00h - 14:00h"
          defaultValue={inicial?.horario_trabalho ?? ''}
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
        <Link href="/especialistas" className="text-sm text-gray-500 hover:text-gray-900">
          Cancelar
        </Link>
      </div>
    </form>
  )
}