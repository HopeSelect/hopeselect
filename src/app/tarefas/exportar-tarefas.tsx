'use client'

import { STATUS_TAREFA, TIPOS_TAREFA } from '@/lib/utils'
import type { LinhaTarefa } from '@/lib/tipos'

const botao =
  'rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900'

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

export function ExportarTarefas({ linhas, de, ate }: { linhas: LinhaTarefa[]; de: string; ate: string }) {
  async function exportarExcel() {
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (window as any).XLSX

    const dados = linhas.map((l) => ({
      Data: l.data,
      Matrícula: l.aluno_matricula ?? '',
      Aluno: l.aluno_nome,
      Professor: l.professor_nome,
      Tarefa: TIPOS_TAREFA[l.tipo],
      Status: STATUS_TAREFA[l.status].rotulo,
      Observação: l.observacao ?? '',
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados), 'Tarefas')
    XLSX.writeFile(wb, `tarefas_${de}_a_${ate}.xlsx`)
  }

  async function exportarPdf() {
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf')
    await carregarScript(
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
      'jspdfAutoTablePluginLoaded',
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { jsPDF } = (window as any).jspdf

    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(`Relatório de tarefas — ${de} a ${ate}`, 14, 16)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(doc as any).autoTable({
      startY: 24,
      head: [['Data', 'Matrícula', 'Aluno', 'Professor', 'Tarefa', 'Status']],
      body: linhas.map((l) => [
        l.data,
        l.aluno_matricula ?? '',
        l.aluno_nome,
        l.professor_nome,
        TIPOS_TAREFA[l.tipo],
        STATUS_TAREFA[l.status].rotulo,
      ]),
      styles: { fontSize: 8 },
    })

    doc.save(`tarefas_${de}_a_${ate}.pdf`)
  }

  return (
    <div className="flex gap-2">
      <button onClick={exportarExcel} className={botao}>
        Exportar Excel
      </button>
      <button onClick={exportarPdf} className={botao}>
        Exportar PDF
      </button>
    </div>
  )
}
