'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TIPOS_TAREFA } from '@/lib/utils'
import type { TipoTarefa } from '@/lib/tipos'

const campo = 'rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-gray-900'

export function FiltrosAtendimentos({
  professores,
  aluno,
  professorSelecionado,
  tipoSelecionado,
  dias,
  de,
  ate,
}: {
  professores: { id: string; nome: string }[]
  aluno: string
  professorSelecionado: string
  tipoSelecionado: string
  dias: number | null
  de: string
  ate: string
}) {
  const router = useRouter()
  const [valorAluno, setValorAluno] = useState(aluno)
  const [valorDe, setValorDe] = useState(de)
  const [valorAte, setValorAte] = useState(ate)
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(dias === null)

  function montarParams(extra: { aluno?: string; professor?: string; tipo?: string }) {
    const params = new URLSearchParams()
    const alunoValor = extra.aluno ?? aluno
    const professor = extra.professor ?? professorSelecionado
    const tipo = extra.tipo ?? tipoSelecionado
    if (alunoValor) params.set('aluno', alunoValor)
    if (professor) params.set('professor', professor)
    if (tipo) params.set('tipo', tipo)
    return params
  }

  function navegarComPeriodo(params: URLSearchParams) {
    if (dias === null) {
      params.set('de', de)
      params.set('ate', ate)
    } else {
      params.set('dias', String(dias))
    }
    router.push(`/relatorios?${params.toString()}`)
  }

  function aplicarAluno() {
    navegarComPeriodo(montarParams({ aluno: valorAluno }))
  }

  function aoTrocarProfessor(valor: string) {
    navegarComPeriodo(montarParams({ professor: valor }))
  }

  function aoTrocarTipo(valor: string) {
    navegarComPeriodo(montarParams({ tipo: valor }))
  }

  function aplicarComDias(novoDias: number) {
    const params = montarParams({})
    params.set('dias', String(novoDias))
    setMostrarPersonalizado(false)
    router.push(`/relatorios?${params.toString()}`)
  }

  function aplicarPersonalizado() {
    const params = montarParams({})
    params.set('de', valorDe)
    params.set('ate', valorAte)
    router.push(`/relatorios?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-gray-700">
        Aluno
        <div className="mt-1 flex gap-1">
          <input
            value={valorAluno}
            onChange={(e) => setValorAluno(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicarAluno()}
            placeholder="Nome do aluno…"
            className={campo}
          />
          <button
            onClick={aplicarAluno}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 hover:border-gray-400"
          >
            Buscar
          </button>
        </div>
      </label>

      <label className="text-sm text-gray-700">
        Professor
        <select
          value={professorSelecionado}
          onChange={(e) => aoTrocarProfessor(e.target.value)}
          className={`mt-1 block ${campo}`}
        >
          <option value="">Todos</option>
          {professores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-700">
        Tarefa
        <select
          value={tipoSelecionado}
          onChange={(e) => aoTrocarTipo(e.target.value)}
          className={`mt-1 block ${campo}`}
        >
          <option value="">Todas</option>
          {(Object.keys(TIPOS_TAREFA) as TipoTarefa[]).map((t) => (
            <option key={t} value={t}>
              {TIPOS_TAREFA[t]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end gap-1">
        {[7, 15, 30].map((n) => (
          <button
            key={n}
            onClick={() => aplicarComDias(n)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              dias === n ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {n}d
          </button>
        ))}
        <button
          onClick={() => setMostrarPersonalizado((v) => !v)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
            dias === null ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          Personalizado
        </button>
      </div>

      {mostrarPersonalizado && (
        <div className="flex items-end gap-2">
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
            onClick={aplicarPersonalizado}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
