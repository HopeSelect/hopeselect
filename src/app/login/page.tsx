'use client'

import { useActionState } from 'react'
import { entrar } from './actions'

export default function LoginPage() {
  const [estado, acao, pendente] = useActionState(entrar, null)

  return (
    <main className="flex min-h-full items-center justify-center bg-gray-50 p-4">
      <form
        action={acao}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Hope Select</h1>
          <p className="text-sm text-gray-500">Gestão de sala da academia</p>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Senha
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </label>

        {estado?.erro && (
          <p className="text-sm text-red-600" role="alert">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {pendente ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
