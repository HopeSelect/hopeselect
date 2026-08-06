'use client'

import { useState } from 'react'
import { TIPOS_TAREFA, statusPlano } from '@/lib/utils'
import type { LinhaAtendimento, LinhaOcupacaoProfessor, LinhaProdutividade } from '@/lib/tipos'
import type { LinhaAlunoRelatorio } from './page'

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

type Formato = 'excel' | 'pdf'

export function ExportarBotoes({
  atendimentos,
  produtividade,
  alunos,
  ocupacao,
  de,
  ate,
}: {
  atendimentos: LinhaAtendimento[]
  produtividade: LinhaProdutividade[]
  alunos: LinhaAlunoRelatorio[]
  ocupacao: LinhaOcupacaoProfessor[]
  de: string
  ate: string
}) {
  const [formatoAberto, setFormatoAberto] = useState<Formato | null>(null)
  const [incluirAtendimentos, setIncluirAtendimentos] = useState(true)
  const [incluirProdutividade, setIncluirProdutividade] = useState(true)
  const [incluirAlunos, setIncluirAlunos] = useState(true)
  const [incluirOcupacao, setIncluirOcupacao] = useState(true)
  const [gerando, setGerando] = useState(false)

  const nadaSelecionado = !incluirAtendimentos && !incluirProdutividade && !incluirAlunos && !incluirOcupacao
  const quantosSelecionados = [incluirAtendimentos, incluirProdutividade, incluirAlunos, incluirOcupacao].filter(
    Boolean,
  ).length

  function nomeArquivo(extensao: string) {
    if (quantosSelecionados > 1) return `relatorio_${de}_a_${ate}.${extensao}`
    if (incluirAlunos) return `alunos_cadastrados.${extensao}`
    if (incluirAtendimentos) return `atendimentos_${de}_a_${ate}.${extensao}`
    if (incluirOcupacao) return `ocupacao_professores_${de}_a_${ate}.${extensao}`
    return `produtividade_${de}_a_${ate}.${extensao}`
  }

  async function exportarExcel() {
    setGerando(true)
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (window as any).XLSX

    const wb = XLSX.utils.book_new()

    if (incluirAtendimentos) {
      const linhas = atendimentos.map((l) => ({
        Data: l.data,
        Aluno: l.aluno_nome,
        Classificação: l.aluno_classificacao,
        Professor: l.professor_nome,
        Tarefa: l.tarefa ? TIPOS_TAREFA[l.tarefa] : '',
        Entrada: l.entrada_hms,
        Saída: l.em_andamento ? 'em andamento' : l.saida_hms,
        Duração: l.duracao_hms,
      }))
      const wsAtendimentos = XLSX.utils.json_to_sheet(linhas)
      // Linha em branco + total, logo depois da última linha de dado.
      XLSX.utils.sheet_add_aoa(
        wsAtendimentos,
        [[], [`Total: ${atendimentos.length} atendimento${atendimentos.length === 1 ? '' : 's'}`]],
        { origin: -1 },
      )
      XLSX.utils.book_append_sheet(wb, wsAtendimentos, 'Atendimentos')
    }

    if (incluirProdutividade) {
      const linhas = produtividade.map((l) => ({
        Data: l.data,
        Professor: l.professor_nome,
        Atendimentos: l.total_atendimentos,
        'Tarefas concluídas': l.total_tarefas_concluidas,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'Produtividade')
    }

    if (incluirAlunos) {
      const linhas = alunos.map((a) => ({
        Matrícula: a.matricula ?? '',
        Nome: a.nome,
        Classificação: a.classificacao,
        Telefone: a.telefone ?? '',
        Email: a.email ?? '',
        Professor: a.professores?.nome ?? '',
        'Data da matrícula': a.data_matricula ?? '',
        'Vencimento do plano': a.vencimento_plano ?? '',
        Situação: statusPlano(a.vencimento_plano)?.rotulo ?? 'Em dia',
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'Alunos')
    }

    if (incluirOcupacao) {
      const linhas = ocupacao.map((o) => ({
        Professor: o.professor_nome,
        'Horas escaladas': o.horas_escaladas,
        'Horas trabalhadas': o.horas_trabalhadas,
        'Ocupação (%)': o.percentual ?? '',
        'Ganhou premiação (≥40%)': o.percentual !== null && o.percentual >= 40 ? 'Sim' : 'Não',
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'Ocupação')
    }

    XLSX.writeFile(wb, nomeArquivo('xlsx'))
    setGerando(false)
    setFormatoAberto(null)
  }

  async function exportarPdf() {
    setGerando(true)
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf')
    await carregarScript(
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
      'jspdfAutoTablePluginLoaded',
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { jsPDF } = (window as any).jspdf

    const doc = new jsPDF()
    const soAlunos = incluirAlunos && !incluirAtendimentos && !incluirProdutividade

    let y = 16
    doc.setFontSize(14)
    doc.text(soAlunos ? 'Alunos cadastrados' : `Relatório de sala — ${de} a ${ate}`, 14, y)
    y += 10

    if (incluirAtendimentos) {
      doc.setFontSize(11)
      doc.text('Atendimentos', 14, y)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(doc as any).autoTable({
        startY: y + 4,
        head: [['Data', 'Aluno', 'Classe', 'Professor', 'Tarefa', 'Entrada', 'Saída', 'Duração']],
        body: atendimentos.map((l) => [
          l.data,
          l.aluno_nome,
          l.aluno_classificacao,
          l.professor_nome,
          l.tarefa ? TIPOS_TAREFA[l.tarefa] : '',
          l.entrada_hms,
          l.em_andamento ? 'em andamento' : l.saida_hms,
          l.duracao_hms,
        ]),
        styles: { fontSize: 8 },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 6
      doc.setFontSize(9)
      doc.text(`Total: ${atendimentos.length} atendimento${atendimentos.length === 1 ? '' : 's'}`, 14, y)
      y += 10
    }

    if (incluirProdutividade) {
      doc.setFontSize(11)
      doc.text('Produtividade por professor', 14, y)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(doc as any).autoTable({
        startY: y + 4,
        head: [['Data', 'Professor', 'Atendimentos', 'Tarefas concluídas']],
        body: produtividade.map((l) => [
          l.data,
          l.professor_nome,
          String(l.total_atendimentos),
          String(l.total_tarefas_concluidas),
        ]),
        styles: { fontSize: 8 },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10
    }

    if (incluirAlunos) {
      // Se vier junto com outra seção, ganha página própria (lista completa,
      // não tem a ver com o período filtrado acima). Se for a única coisa
      // selecionada, começa direto no topo da primeira página.
      if (incluirAtendimentos || incluirProdutividade) {
        doc.addPage()
        y = 16
      }
      doc.setFontSize(11)
      doc.text('Alunos matriculados', 14, y)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(doc as any).autoTable({
        startY: y + 4,
        head: [['Matrícula', 'Nome', 'Classe', 'Telefone', 'Professor', 'Data matrícula', 'Situação']],
        body: alunos.map((a) => [
          a.matricula ?? '',
          a.nome,
          a.classificacao,
          a.telefone ?? '',
          a.professores?.nome ?? '',
          a.data_matricula ?? '',
          statusPlano(a.vencimento_plano)?.rotulo ?? 'Em dia',
        ]),
        styles: { fontSize: 8 },
      })
    }

    if (incluirOcupacao) {
      if (incluirAtendimentos || incluirProdutividade || incluirAlunos) {
        doc.addPage()
        y = 16
      }
      doc.setFontSize(11)
      doc.text('Ocupação por professor', 14, y)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(doc as any).autoTable({
        startY: y + 4,
        head: [['Professor', 'Horas escaladas', 'Horas trabalhadas', 'Ocupação', 'Premiação (≥40%)']],
        body: ocupacao.map((o) => [
          o.professor_nome,
          `${o.horas_escaladas}h`,
          `${o.horas_trabalhadas}h`,
          o.percentual !== null ? `${o.percentual}%` : '—',
          o.percentual !== null && o.percentual >= 40 ? 'Sim' : 'Não',
        ]),
        styles: { fontSize: 8 },
      })
    }

    doc.save(nomeArquivo('pdf'))
    setGerando(false)
    setFormatoAberto(null)
  }

  async function confirmar() {
    if (formatoAberto === 'excel') await exportarExcel()
    else if (formatoAberto === 'pdf') await exportarPdf()
  }

  return (
    <>
      <div className="flex gap-2">
        <button onClick={() => setFormatoAberto('excel')} className={botao}>
          Exportar Excel
        </button>
        <button onClick={() => setFormatoAberto('pdf')} className={botao}>
          Exportar PDF
        </button>
      </div>

      {formatoAberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                O que exportar? ({formatoAberto === 'excel' ? 'Excel' : 'PDF'})
              </h2>
              <button
                onClick={() => setFormatoAberto(null)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 p-4">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={incluirAtendimentos}
                  onChange={(e) => setIncluirAtendimentos(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Atendimentos
                  <span className="block text-xs text-gray-400">
                    Do período filtrado ({de} a {ate})
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={incluirProdutividade}
                  onChange={(e) => setIncluirProdutividade(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Produtividade por professor
                  <span className="block text-xs text-gray-400">
                    Do período filtrado ({de} a {ate})
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={incluirAlunos}
                  onChange={(e) => setIncluirAlunos(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Alunos cadastrados
                  <span className="block text-xs text-gray-400">
                    Lista completa — não considera o período filtrado
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={incluirOcupacao}
                  onChange={(e) => setIncluirOcupacao(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Ocupação por professor
                  <span className="block text-xs text-gray-400">
                    Horas escaladas x trabalhadas, do período filtrado
                  </span>
                </span>
              </label>

              {nadaSelecionado && (
                <p className="text-xs text-red-600">Selecione pelo menos uma opção.</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={confirmar}
                  disabled={nadaSelecionado || gerando}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {gerando ? 'Gerando…' : 'Exportar'}
                </button>
                <button
                  onClick={() => setFormatoAberto(null)}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
