'use client'

import { useEffect, useState } from 'react'
import { criarClienteBrowser } from '@/lib/supabase/client'
import type { Professor } from '@/lib/tipos'
import { adicionarProfessorNaSala } from './actions'

export function BuscarProfessorParaSala({
  idsNaSala,
  onAdicionado,
}: {
  idsNaSala: string[]
  onAdicionado: (professor: Professor) => void
}) {
  const supabase = criarClienteBrowser()
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Professor[]>([])
  const [buscando, setBuscando] = useState(false)
  const [adicionandoId, setAdicionandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([])
      return
    }
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('professores')
        .select('*')
        .eq('ativo', true)
        .ilike('nome', `%${termo.trim()}%`)
        .order('nome')
        .limit(8)
      if (!cancelado) {
        if (error) setErro(error.message)
        setResultados((data ?? []) as Professor[])
        setBuscando(false)
      }
    }, 250)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [termo, supabase])

  async function adicionar(professor: Professor) {
    setAdicionandoId(professor.id)
    setErro(null)
    const resultado = await adicionarProfessorNaSala(professor.id)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setAdicionandoId(null)
      return
    }
    onAdicionado({ ...professor, em_sala: true })
    setTermo('')
    setResultados([])
    setAdicionandoId(null)
  }

  const mostrarResultados = termo.trim().length >= 2

  return (
    <div className="w-full max-w-md">
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Buscar professor pelo nome para adicionar à sala…"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
      />

      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}

      {mostrarResultados && (
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-sm">
          {buscando && <p className="px-2 py-1.5 text-xs text-gray-400">Buscando…</p>}
          {!buscando &&
            resultados.map((professor) => {
              const jaNaSala = idsNaSala.includes(professor.id)
              return (
                <div
                  key={professor.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                >
                  <span className="truncate text-sm text-gray-900">{professor.nome}</span>
                  {jaNaSala ? (
                    <span className="shrink-0 text-xs text-gray-400">Já está na sala</span>
                  ) : (
                    <button
                      onClick={() => adicionar(professor)}
                      disabled={adicionandoId !== null}
                      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 disabled:opacity-60"
                    >
                      {adicionandoId === professor.id ? 'Adicionando…' : '+ Adicionar à sala'}
                    </button>
                  )}
                </div>
              )
            })}
          {!buscando && resultados.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-gray-400">Nenhum professor encontrado.</p>
          )}
        </div>
      )}
    </div>
  )
}
