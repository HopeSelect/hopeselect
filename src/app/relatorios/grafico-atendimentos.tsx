'use client'

import { useEffect, useRef } from 'react'
import { TIPOS_TAREFA } from '@/lib/utils'
import type { LinhaAtendimento, TipoTarefa } from '@/lib/tipos'

function carregarScript(src: string, chaveGlobal: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any)[chaveGlobal]) {
      resolve()
      return
    }
    const tag = document.createElement('script')
    tag.src = src
    tag.onload = () => resolve()
    tag.onerror = () => reject(new Error(`Falha ao carregar ${src}`))
    document.body.appendChild(tag)
  })
}

const CORES = ['#111827', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0d9488', '#be185d']

export function GraficoAtendimentos({ linhas }: { linhas: LinhaAtendimento[] }) {
  const canvasPorDiaRef = useRef<HTMLCanvasElement>(null)
  const canvasDuracaoRef = useRef<HTMLCanvasElement>(null)
  const canvasPorProfessorRef = useRef<HTMLCanvasElement>(null)
  const canvasPorTarefaRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graficosRef = useRef<any[]>([])

  useEffect(() => {
    let cancelado = false

    async function montar() {
      await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js', 'Chart')
      if (cancelado) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Chart = (window as any).Chart

      graficosRef.current.forEach((g) => g.destroy())
      graficosRef.current = []

      // --- Atendimentos por dia (quantas vezes o aluno foi) ---
      const porDia = new Map<string, number>()
      for (const l of linhas) porDia.set(l.data, (porDia.get(l.data) ?? 0) + 1)
      const diasOrdenados = [...porDia.keys()].sort()

      if (canvasPorDiaRef.current) {
        graficosRef.current.push(
          new Chart(canvasPorDiaRef.current, {
            type: 'bar',
            data: {
              labels: diasOrdenados.map((d) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR')),
              datasets: [
                { label: 'Atendimentos', data: diasOrdenados.map((d) => porDia.get(d) ?? 0), backgroundColor: '#111827' },
              ],
            },
            options: { responsive: true, plugins: { legend: { display: false } } },
          }),
        )
      }

      // --- Duração total por dia (tempo de treino) ---
      const duracaoPorDia = new Map<string, number>()
      for (const l of linhas) duracaoPorDia.set(l.data, (duracaoPorDia.get(l.data) ?? 0) + l.duracao_min)

      if (canvasDuracaoRef.current) {
        graficosRef.current.push(
          new Chart(canvasDuracaoRef.current, {
            type: 'line',
            data: {
              labels: diasOrdenados.map((d) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR')),
              datasets: [
                {
                  label: 'Minutos de treino',
                  data: diasOrdenados.map((d) => Math.round(duracaoPorDia.get(d) ?? 0)),
                  borderColor: '#2563eb',
                  backgroundColor: '#2563eb',
                  tension: 0.2,
                },
              ],
            },
            options: { responsive: true, plugins: { legend: { display: false } } },
          }),
        )
      }

      // --- Com quais professores treinou ---
      const porProfessor = new Map<string, number>()
      for (const l of linhas) porProfessor.set(l.professor_nome, (porProfessor.get(l.professor_nome) ?? 0) + 1)
      const professoresComDado = [...porProfessor.keys()].sort(
        (a, b) => (porProfessor.get(b) ?? 0) - (porProfessor.get(a) ?? 0),
      )

      if (canvasPorProfessorRef.current) {
        graficosRef.current.push(
          new Chart(canvasPorProfessorRef.current, {
            type: 'bar',
            data: {
              labels: professoresComDado,
              datasets: [
                {
                  label: 'Atendimentos',
                  data: professoresComDado.map((p) => porProfessor.get(p) ?? 0),
                  backgroundColor: CORES,
                },
              ],
            },
            options: { responsive: true, plugins: { legend: { display: false } }, indexAxis: 'y' },
          }),
        )
      }

      // --- Quais tarefas foram realizadas ---
      const porTarefa = new Map<string, number>()
      for (const l of linhas) {
        const chave = l.tarefa ? TIPOS_TAREFA[l.tarefa as TipoTarefa] : 'Sem tarefa'
        porTarefa.set(chave, (porTarefa.get(chave) ?? 0) + 1)
      }
      const tarefasComDado = [...porTarefa.keys()]

      if (canvasPorTarefaRef.current) {
        graficosRef.current.push(
          new Chart(canvasPorTarefaRef.current, {
            type: 'doughnut',
            data: {
              labels: tarefasComDado,
              datasets: [{ data: tarefasComDado.map((t) => porTarefa.get(t) ?? 0), backgroundColor: CORES }],
            },
            options: { responsive: true },
          }),
        )
      }
    }

    void montar()

    return () => {
      cancelado = true
      graficosRef.current.forEach((g) => g.destroy())
      graficosRef.current = []
    }
  }, [linhas])

  if (linhas.length === 0) {
    return <p className="mt-6 text-sm text-gray-400">Sem dados no período pra gerar gráficos.</p>
  }

  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Atendimentos por dia</h3>
        <canvas ref={canvasPorDiaRef} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Minutos de treino por dia</h3>
        <canvas ref={canvasDuracaoRef} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Com quais professores treinou</h3>
        <canvas ref={canvasPorProfessorRef} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Tarefas realizadas</h3>
        <canvas ref={canvasPorTarefaRef} />
      </div>
    </div>
  )
}
