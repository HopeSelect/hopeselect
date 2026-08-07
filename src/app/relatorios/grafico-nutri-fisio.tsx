'use client'

import { useEffect, useRef } from 'react'
import { ehModoEscuro, useTemaObservado } from '@/lib/use-tema'

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

export function GraficoNutriFisio({ nutri, fisio }: { nutri: { data: string }[]; fisio: { data: string }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graficoRef = useRef<any>(null)
  const temaTick = useTemaObservado()

  useEffect(() => {
    let cancelado = false

    async function montar() {
      await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js', 'Chart')
      if (cancelado) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Chart = (window as any).Chart

      if (graficoRef.current) graficoRef.current.destroy()
      if (!canvasRef.current) return

      const escuro = ehModoEscuro()
      const corTexto = escuro ? '#9ca3af' : '#4b5563'
      const corGrade = escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

      const porDiaNutri = new Map<string, number>()
      for (const l of nutri) porDiaNutri.set(l.data, (porDiaNutri.get(l.data) ?? 0) + 1)
      const porDiaFisio = new Map<string, number>()
      for (const l of fisio) porDiaFisio.set(l.data, (porDiaFisio.get(l.data) ?? 0) + 1)

      const todosDias = [...new Set([...porDiaNutri.keys(), ...porDiaFisio.keys()])].sort()

      graficoRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: todosDias.map((d) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR')),
          datasets: [
            { label: 'Nutricionista', data: todosDias.map((d) => porDiaNutri.get(d) ?? 0), backgroundColor: '#0d9488' },
            { label: 'Fisioterapeuta', data: todosDias.map((d) => porDiaFisio.get(d) ?? 0), backgroundColor: '#7c3aed' },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: corTexto } } },
          scales: {
            x: { ticks: { color: corTexto }, grid: { color: corGrade } },
            y: { ticks: { color: corTexto }, grid: { color: corGrade } },
          },
        },
      })
    }

    void montar()

    return () => {
      cancelado = true
      graficoRef.current?.destroy()
    }
  }, [nutri, fisio, temaTick])

  if (nutri.length === 0 && fisio.length === 0) {
    return <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Sem dados no período pra gerar gráfico.</p>
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Atendimentos por dia</h3>
      <canvas ref={canvasRef} />
    </div>
  )
}
