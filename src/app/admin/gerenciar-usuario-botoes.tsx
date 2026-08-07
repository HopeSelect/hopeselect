'use client'

import { useState, useTransition } from 'react'
import { alterarPapelUsuario, definirAtivoUsuario } from './actions'
import type { Papel } from '@/lib/tipos'

const PAPEIS: Papel[] = ['admin', 'lider', 'recepcao', 'professor']

export function GerenciarUsuarioBotoes({
  usuario,
  souEuMesmo,
}: {
  usuario: { id: string; papel: Papel; ativo: boolean }
  souEuMesmo: boolean
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function aoTrocarPapel(e: React.ChangeEvent<HTMLSelectElement>) {
    setErro(null)
    const novoPapel = e.target.value as Papel
    startTransition(async () => {
      const resultado = await alterarPapelUsuario(usuario.id, novoPapel)
      if (resultado?.erro) setErro(resultado.erro)
    })
  }

  function aoTrocarAtivo() {
    setErro(null)
    if (souEuMesmo && usuario.ativo) {
      if (!confirm('Isso vai desativar seu próprio acesso. Continuar?')) return
    }
    startTransition(async () => {
      const resultado = await definirAtivoUsuario(usuario.id, !usuario.ativo)
      if (resultado?.erro) setErro(resultado.erro)
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        defaultValue={usuario.papel}
        onChange={aoTrocarPapel}
        disabled={pendente}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs"
      >
        {PAPEIS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        onClick={aoTrocarAtivo}
        disabled={pendente}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-60"
      >
        {usuario.ativo ? 'Desativar' : 'Ativar'}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}