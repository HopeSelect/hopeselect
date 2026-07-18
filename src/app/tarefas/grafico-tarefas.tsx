'use client'

import { useEffect, useRef } from 'react'
import { STATUS_TAREFA, TIPOS_TAREFA } from '@/lib/utils'
import type { LinhaTarefa, StatusTarefa, TipoTarefa } from '@/lib/tipos'

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

const CORES = ['#111827', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed']

export function GraficoTarefas({ linhas }: { linhas: LinhaTarefa[] }) {
  const canvasPorDiaRef = useRef<HTMLCanvasElement>(null)
  const canvasPorTipoRef = useRef<HTMLCanvasElement>(null)
  const canvasPorStatusRef = useRef<HTMLCanvasElement>(null)
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
                { label: 'Tarefas por dia', data: diasOrdenados.map((d) => porDia.get(d) ?? 0), backgroundColor: '#111827' },
              ],
            },
            options: { responsive: true, plugins: { legend: { display: false } } },
          }),
        )
      }

      const porTipo = new Map<TipoTarefa, number>()
      for (const l of linhas) porTipo.set(l.tipo, (porTipo.get(l.tipo) ?? 0) + 1)
      const tiposComDado = (Object.keys(TIPOS_TAREFA) as TipoTarefa[]).filter((t) => (porTipo.get(t) ?? 0) > 0)

      if (canvasPorTipoRef.current) {
        graficosRef.current.push(
          new Chart(canvasPorTipoRef.current, {
            type: 'bar',
            data: {
              labels: tiposComDado.map((t) => TIPOS_TAREFA[t]),
              datasets: [{ label: 'Tarefas por tipo', data: tiposComDado.map((t) => porTipo.get(t) ?? 0), backgroundColor: CORES }],
            },
            options: { responsive: true, plugins: { legend: { display: false } } },
          }),
        )
      }

      const porStatus = new Map<StatusTarefa, number>()
      for (const l of linhas) porStatus.set(l.status, (porStatus.get(l.status) ?? 0) + 1)
      const chaves = [...porStatus.keys()]

      if (canvasPorStatusRef.current) {
        graficosRef.current.push(
          new Chart(canvasPorStatusRef.current, {
            type: 'doughnut',
            data: {
              labels: chaves.map((s) => STATUS_TAREFA[s].rotulo),
              datasets: [{ data: chaves.map((s) => porStatus.get(s) ?? 0), backgroundColor: CORES }],
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
    <div className="mt-6 grid gap-6 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Por dia</h3>
        <canvas ref={canvasPorDiaRef} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Por tipo</h3>
        <canvas ref={canvasPorTipoRef} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Por status</h3>
        <canvas ref={canvasPorStatusRef} />
      </div>
    </div>
  )
}
