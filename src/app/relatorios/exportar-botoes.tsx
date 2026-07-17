'use client'

import type { LinhaAtendimento, LinhaProdutividade } from '@/lib/tipos'

const botao =
  'rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900'

// Carrega um script externo uma única vez (cache no window) — evita precisar
// instalar xlsx/jspdf via npm, já que editamos direto pelo GitHub.
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

export function ExportarBotoes({
  atendimentos,
  produtividade,
  de,
  ate,
}: {
  atendimentos: LinhaAtendimento[]
  produtividade: LinhaProdutividade[]
  de: string
  ate: string
}) {
  async function exportarExcel() {
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (window as any).XLSX

    const linhasAtendimentos = atendimentos.map((l) => ({
      Data: l.data,
      Aluno: l.aluno_nome,
      Classificação: l.aluno_classificacao,
      Professor: l.professor_nome,
      'Duração (min)': l.em_andamento ? 'em andamento' : l.duracao_min,
    }))

    const linhasProdutividade = produtividade.map((l) => ({
      Data: l.data,
      Professor: l.professor_nome,
      Atendimentos: l.total_atendimentos,
      'Tarefas concluídas': l.total_tarefas_concluidas,
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhasAtendimentos), 'Atendimentos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhasProdutividade), 'Produtividade')
    XLSX.writeFile(wb, `relatorio_${de}_a_${ate}.xlsx`)
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
    doc.text(`Relatório de sala — ${de} a ${ate}`, 14, 16)

    doc.setFontSize(11)
    doc.text('Atendimentos', 14, 26)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(doc as any).autoTable({
      startY: 30,
      head: [['Data', 'Aluno', 'Classe', 'Professor', 'Duração']],
      body: atendimentos.map((l) => [
        l.data,
        l.aluno_nome,
        l.aluno_classificacao,
        l.professor_nome,
        l.em_andamento ? 'em andamento' : `${l.duracao_min} min`,
      ]),
      styles: { fontSize: 8 },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proximoY = (doc as any).lastAutoTable.finalY + 10
    doc.text('Produtividade por professor', 14, proximoY)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(doc as any).autoTable({
      startY: proximoY + 4,
      head: [['Data', 'Professor', 'Atendimentos', 'Tarefas concluídas']],
      body: produtividade.map((l) => [
        l.data,
        l.professor_nome,
        String(l.total_atendimentos),
        String(l.total_tarefas_concluidas),
      ]),
      styles: { fontSize: 8 },
    })

    doc.save(`relatorio_${de}_a_${ate}.pdf`)
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
