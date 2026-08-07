'use client'

import { useState, useTransition } from 'react'
import { DIAS_SEMANA, formatarHoraCurta } from '@/lib/utils'
import type { HorarioProfessor } from '@/lib/tipos'
import { adicionarHorarioProfessor, removerHorarioProfessor } from '../actions'

export function EscalaProfessor({
  professorId,
  horariosIniciais,
}: {
  professorId: string
  horariosIniciais: HorarioProfessor[]
}) {
  const [horarios, setHorarios] = useState(horariosIniciais)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  // Agrupa por dia da semana, na ordem Domingo→Sábado, cada dia já com
  // seus blocos ordenados por horário — fica fácil de ler "manhã e noite".
  const porDia = DIAS_SEMANA.map((nome, indice) => ({
    indice,
    nome,
    blocos: horarios
      .filter((h) => h.dia_semana === indice)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  }))

  function aoSubmeter(fd: FormData) {
    setErro(null)
    startTransition(async () => {
      const resultado = await adicionarHorarioProfessor(professorId, fd)
      if (resultado?.erro) {
        setErro(resultado.erro)
        return
      }
      // Otimista simples: recarrega a lista via um fetch leve não é
      // necessário aqui porque revalidatePath já atualiza no próximo
      // carregamento — mas pra feedback imediato, monta a linha na hora.
      const diaSemana = Number(fd.get('dia_semana'))
      const horaInicio = String(fd.get('hora_inicio'))
      const horaFim = String(fd.get('hora_fim'))
      setHorarios((prev) => [
        ...prev,
        { id: `otimista-${Date.now()}`, professor_id: professorId, dia_semana: diaSemana, hora_inicio: horaInicio, hora_fim: horaFim },
      ])
    })
  }

  function remover(id: string) {
    setHorarios((prev) => prev.filter((h) => h.id !== id))
    startTransition(() => {
      void removerHorarioProfessor(id, professorId)
    })
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <h2 className="mb-1 font-medium text-gray-900 dark:text-gray-100">Escala semanal</h2>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Adicione um bloco por faixa de horário. Um professor com manhã e noite no mesmo dia tem 2 blocos nesse dia.
      </p>

      <div className="space-y-3">
        {porDia.map((dia) => (
          <div key={dia.indice} className="flex items-start gap-3">
            <span className="w-20 shrink-0 pt-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{dia.nome}</span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {dia.blocos.length === 0 && <span className="pt-1.5 text-xs text-gray-300 dark:text-gray-600">—</span>}
              {dia.blocos.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300"
                >
                  {formatarHoraCurta(b.hora_inicio)}–{formatarHoraCurta(b.hora_fim)}
                  <button
                    type="button"
                    onClick={() => remover(b.id)}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-600"
                    aria-label="Remover bloco"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form action={aoSubmeter} className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Dia
          <select name="dia_semana" defaultValue="1" className="mt-1 block rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm">
            {DIAS_SEMANA.map((nome, indice) => (
              <option key={indice} value={indice}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Início
          <input
            type="time"
            name="hora_inicio"
            required
            className="mt-1 block rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Fim
          <input
            type="time"
            name="hora_fim"
            required
            className="mt-1 block rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-60"
        >
          + Adicionar bloco
        </button>
      </form>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  )
}
