'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const campo =
  'rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

export function FiltroPeriodo({ de, ate }: { de: string; ate: string }) {
  const router = useRouter()
  const [valorDe, setValorDe] = useState(de)
  const [valorAte, setValorAte] = useState(ate)

  function aplicar() {
    router.push(`/relatorios?de=${valorDe}&ate=${valorAte}`)
  }

  return (
    <div className="flex items-end gap-3">
      <label className="text-sm text-gray-700">
        De
        <input
          type="date"
          value={valorDe}
          onChange={(e) => setValorDe(e.target.value)}
          className={`mt-1 block ${campo}`}
        />
      </label>
      <label className="text-sm text-gray-700">
        Até
        <input
          type="date"
          value={valorAte}
          onChange={(e) => setValorAte(e.target.value)}
          className={`mt-1 block ${campo}`}
        />
      </label>
      <button
        onClick={aplicar}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Filtrar
      </button>
    </div>
  )
}
