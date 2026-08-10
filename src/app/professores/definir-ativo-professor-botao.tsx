'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { definirAtivoProfessor } from './actions'

export function DefinirAtivoProfessorBotao({ id, ativo }: { id: string; ativo: boolean }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function aoClicar() {
    setErro(null)
    startTransition(async () => {
      const resultado = await definirAtivoProfessor(id, !ativo)
      if (resultado?.erro) {
        setErro(resultado.erro)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="text-right">
      <button
        onClick={aoClicar}
        disabled={pendente}
        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-60"
      >
        {pendente ? '…' : ativo ? 'Desativar' : 'Ativar'}
      </button>
      {erro && <p className="mt-1 max-w-[16rem] text-xs text-red-600">{erro}</p>}
    </div>
  )
}
