'use client'

import { useEffect, useRef } from 'react'
import { TIPOS_TAREFA } from '@/lib/utils'
import { ehModoEscuro, useTemaObservado } from '@/lib/use-tema'
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

export function GraficoAtendimentos({
  linhas,
  tarefasConcluidas,
}: {
  linhas: LinhaAtendimento[]
  tarefasConcluidas: { tipo: TipoTarefa }[]
}) {
  const canvasPorDiaRef = useRef<HTMLCanvasElement>(null)
  const canvasDuracaoRef = useRef<HTMLCanvasElement>(null)
  const canvasPorProfessorRef = useRef<HTMLCanvasElement>(null)
  const canvasPorTarefaRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graficosRef = useRef<any[]>([])
  const temaTick = useTemaObservado()

  useEffect(() => {
    let cancelado = false

    async function montar() {
      await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js', 'Chart')
      if (cancelado) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Chart = (window as any).Chart

      graficosRef.current.forEach((g) => g.destroy())
      graficosRef.current = []

      // Paleta reativa ao tema — a cor "principal" (preto no claro) vira
      // um cinza bem claro no escuro, senão fica invisível no fundo escuro.
      const escuro = ehModoEscuro()
      const corPrincipal = escuro ? '#e5e7eb' : '#111827'
      const corTexto = escuro ? '#9ca3af' : '#4b5563'
      const corGrade = escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
      const CORES = [corPrincipal, '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0d9488', '#be185d']
      const opcoesEscala = {
        x: { ticks: { color: corTexto }, grid: { color: corGrade } },
        y: { ticks: { color: corTexto }, grid: { color: corGrade } },
      }

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
                { label: 'Atendimentos', data: diasOrdenados.map((d) => porDia.get(d) ?? 0), backgroundColor: corPrincipal },
              ],
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: opcoesEscala },
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
            options: { responsive: true, plugins: { legend: { display: false } }, scales: opcoesEscala },
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
            options: { responsive: true, plugins: { legend: { display: false } }, indexAxis: 'y', scales: opcoesEscala },
          }),
        )
      }

      // --- Atendimento (total de sessões no período) + tarefas concluídas
      // por tipo (histórico real do módulo Tarefas, não a etiqueta opcional
      // do atendimento — por isso conta certo mesmo quando a tarefa foi
      // lançada e concluída em datas diferentes) ---
      const porTarefa = new Map<string, number>()
      porTarefa.set('Atendimento', linhas.length)
      for (const t of tarefasConcluidas) {
        const chave = TIPOS_TAREFA[t.tipo]
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
            options: { responsive: true, plugins: { legend: { labels: { color: corTexto } } } },
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
  }, [linhas, tarefasConcluidas, temaTick])

  if (linhas.length === 0 && tarefasConcluidas.length === 0) {
    return <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">Sem dados no período pra gerar gráficos.</p>
  }

  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Atendimentos por dia</h3>
        <canvas ref={canvasPorDiaRef} />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Minutos de treino por dia</h3>
        <canvas ref={canvasDuracaoRef} />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Atendimentos realizados por professor</h3>
        <canvas ref={canvasPorProfessorRef} />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Atendimentos e tarefas</h3>
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
          &quot;Atendimento&quot; é do período filtrado; as tarefas concluídas por tipo são de todos os tempos.
        </p>
        <canvas ref={canvasPorTarefaRef} />
      </div>
    </div>
  )
}
