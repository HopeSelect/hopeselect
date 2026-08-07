'use client'

import { useActionState } from 'react'
import { criarNutricionista, type EstadoForm } from './actions'
import { FotoNutricionista } from './foto-nutricionista'

const campo =
  'mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm outline-none focus:border-gray-900 dark:focus:border-brand-400'

export function NutricionistaForm() {
  const [estado, submit, pendente] = useActionState<EstadoForm, FormData>(criarNutricionista, null)

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Foto
        <div className="mt-1">
          <FotoNutricionista />
        </div>
      </label>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Nome *
        <input name="nome" required className={campo} />
      </label>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Horário de trabalho
        <input name="horario_trabalho" placeholder="Ex: 08:00h - 14:00h" className={campo} />
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
        {pendente ? 'Salvando…' : 'Cadastrar nutricionista'}
      </button>
    </form>
  )
}
