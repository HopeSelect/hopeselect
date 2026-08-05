'use client'

import { useEffect, useRef, useState } from 'react'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { TIPOS_ESPECIALISTA } from '@/lib/utils'
import type { Especialista } from '@/lib/tipos'
import { adicionarEspecialistaNaSala } from './actions'

export function BuscarEspecialistaParaSala({
  idsNaSala,
  onAdicionado,
}: {
  idsNaSala: string[]
  onAdicionado: (especialista: Especialista) => void
}) {
  const supabase = criarClienteBrowser()
  const containerRef = useRef<HTMLDivElement>(null)
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [resultados, setResultados] = useState<Especialista[]>([])
  const [buscando, setBuscando] = useState(false)
  const [adicionandoId, setAdicionandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(async () => {
      let query = supabase.from('especialistas').select('*').eq('ativo', true).order('nome').limit(100)
      if (termo.trim().length >= 1) query = query.ilike('nome', `%${termo.trim()}%`)
      const { data, error } = await query
      if (!cancelado) {
        if (error) setErro(error.message)
        setResultados((data ?? []) as Especialista[])
        setBuscando(false)
      }
    }, 200)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [termo, aberto, supabase])

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  async function adicionar(especialista: Especialista) {
    setAdicionandoId(especialista.id)
    setErro(null)
    const resultado = await adicionarEspecialistaNaSala(especialista.id)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setAdicionandoId(null)
      return
    }
    onAdicionado({ ...especialista, em_sala: true })
    setAdicionandoId(null)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setAberto(true)}
          placeholder="Buscar ou selecionar especialista para adicionar à sala…"
          className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-9 text-sm outline-none focus:border-gray-900"
        />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400 hover:text-gray-700"
          aria-label={aberto ? 'Fechar lista' : 'Abrir lista de especialistas'}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}

      {aberto && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {buscando && <p className="px-3 py-2 text-xs text-gray-400">Buscando…</p>}
          {!buscando &&
            resultados.map((especialista) => {
              const jaNaSala = idsNaSala.includes(especialista.id)
              const detalhes = [TIPOS_ESPECIALISTA[especialista.tipo], especialista.horario_trabalho]
                .filter(Boolean)
                .join(' · ')
              return (
                <div
                  key={especialista.id}
                  className="flex items-center justify-between gap-2 border-b border-gray-50 px-3 py-2 last:border-0 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-900">{especialista.nome}</p>
                    {detalhes && <p className="truncate text-xs text-gray-400">{detalhes}</p>}
                  </div>
                  {jaNaSala ? (
                    <span className="shrink-0 text-xs text-gray-400">Já está na sala</span>
                  ) : (
                    <button
                      onClick={() => adicionar(especialista)}
                      disabled={adicionandoId !== null}
                      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 disabled:opacity-60"
                    >
                      {adicionandoId === especialista.id ? 'Adicionando…' : '+ Adicionar'}
                    </button>
                  )}
                </div>
              )
            })}
          {!buscando && resultados.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Nenhum especialista encontrado.</p>
          )}
        </div>
      )}
    </div>
  )
}