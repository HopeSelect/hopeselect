'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES } from '@/lib/utils'
import type { Aluno } from '@/lib/tipos'

type OpcaoAluno = Pick<Aluno, 'id' | 'nome' | 'matricula' | 'classificacao'>

export function BuscarAlunoSelect({ valorInicial }: { valorInicial: string }) {
  const supabase = criarClienteBrowser()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [termo, setTermo] = useState(valorInicial)
  const [aberto, setAberto] = useState(false)
  const [resultados, setResultados] = useState<OpcaoAluno[]>([])
  const [buscando, setBuscando] = useState(false)

  // Lista pra rolar: carrega assim que abre (todos os alunos por padrão),
  // ou filtrada pelo termo digitado — igual ao seletor de professor da Sala.
  useEffect(() => {
    if (!aberto) return
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(async () => {
      let query = supabase.from('alunos').select('id, nome, matricula, classificacao').order('nome').limit(100)
      if (termo.trim().length >= 1) query = query.ilike('nome', `%${termo.trim()}%`)
      const { data, error } = await query
      if (!cancelado) {
        if (!error) setResultados((data ?? []) as OpcaoAluno[])
        setBuscando(false)
      }
    }, 200)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [termo, aberto, supabase])

  // Fecha ao clicar fora.
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  // Atualiza a URL (?q=) com um pequeno atraso, pra filtrar também a lista
  // de cards embaixo enquanto digita — sem precisar apertar Enter.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (termo.trim()) params.set('q', termo.trim())
      router.push(`/alunos${params.toString() ? `?${params.toString()}` : ''}`)
    }, 400)
    return () => clearTimeout(t)
  }, [termo, router])

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setAberto(true)}
          placeholder="Buscar ou selecionar aluno pelo nome…"
          className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-9 text-sm outline-none focus:border-gray-900"
        />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400 hover:text-gray-700"
          aria-label={aberto ? 'Fechar lista' : 'Abrir lista de alunos'}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {aberto && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {buscando && <p className="px-3 py-2 text-xs text-gray-400">Buscando…</p>}
          {!buscando &&
            resultados.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/alunos/${a.id}`)}
                className="flex w-full items-center justify-between gap-2 border-b border-gray-50 px-3 py-2 text-left last:border-0 hover:bg-gray-50"
              >
                <span className="min-w-0 truncate text-sm text-gray-900">
                  {a.nome}
                  {a.matricula && <span className="ml-1 text-gray-400">· {a.matricula}</span>}
                </span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[a.classificacao].classe}`}
                >
                  {a.classificacao}
                </span>
              </button>
            ))}
          {!buscando && resultados.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Nenhum aluno encontrado.</p>
          )}
        </div>
      )}
    </div>
  )
}
