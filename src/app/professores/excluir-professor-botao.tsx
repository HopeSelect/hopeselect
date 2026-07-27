'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { excluirProfessor } from './actions'

export function ExcluirProfessorBotao({ id, nome }: { id: string; nome: string }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function aoClicar() {
    setErro(null)
    if (!confirm(`Excluir ${nome} definitivamente? Essa ação não pode ser desfeita.`)) return
    startTransition(async () => {
      const resultado = await excluirProfessor(id)
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
        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-60"
      >
        {pendente ? 'Excluindo…' : 'Excluir'}
      </button>
      {erro && <p className="mt-1 max-w-[16rem] text-xs text-red-600">{erro}</p>}
    </div>
  )
}
