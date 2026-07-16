'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES } from '@/lib/utils'
import type { AlunoResumo, AtendimentoAberto, Professor } from '@/lib/tipos'
import { atualizarPosicaoProfessor, finalizarAtendimento } from './actions'
import { BuscarAluno } from './buscar-aluno'

const LARGURA_CARD = 240
const ALTURA_CARD = 168
const GAP = 16
const COLUNAS = 5

// Posição inicial em grade para professores que ainda não foram arrastados.
function posicaoGrade(indice: number) {
  return {
    x: GAP + (indice % COLUNAS) * (LARGURA_CARD + GAP),
    y: GAP + Math.floor(indice / COLUNAS) * (ALTURA_CARD + GAP),
  }
}

function formatarDecorrido(inicioIso: string, agora: number) {
  const ms = Math.max(0, agora - new Date(inicioIso).getTime())
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

export function PainelSala({
  professoresIniciais,
  atendimentosIniciais,
}: {
  professoresIniciais: Professor[]
  atendimentosIniciais: AtendimentoAberto[]
}) {
  const supabase = useMemo(() => criarClienteBrowser(), [])
  const [professores, setProfessores] = useState(professoresIniciais)
  const [atendimentos, setAtendimentos] = useState(atendimentosIniciais)
  const [alocandoPara, setAlocandoPara] = useState<Professor | null>(null)
  const [agora, setAgora] = useState(() => Date.now())

  // Relógio para os cronômetros dos cards (atualiza a cada 30s, sem revalidar dados).
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Realtime: professores (posição do card) e atendimentos (aloca/finaliza).
  // Isso é o que resolve a dor do Hostess — nada de fechar/reabrir card na mão.
  useEffect(() => {
    const canal = supabase
      .channel('painel-sala')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'professores' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setProfessores((prev) => prev.filter((p) => p.id !== payload.old.id))
            return
          }
          const novo = payload.new as Professor
          setProfessores((prev) => {
            const existe = prev.some((p) => p.id === novo.id)
            if (!novo.ativo) return prev.filter((p) => p.id !== novo.id)
            return existe ? prev.map((p) => (p.id === novo.id ? { ...p, ...novo } : p)) : [...prev, novo]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atendimentos' },
        async (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.fim) {
            // Atendimento finalizado (por qualquer usuário) -> sai do painel.
            setAtendimentos((prev) => prev.filter((a) => a.id !== payload.new.id))
            return
          }
          if (payload.eventType === 'INSERT' && !payload.new.fim) {
            // Novo atendimento aberto por outra sessão: busca o aluno embutido.
            const { data } = await supabase
              .from('atendimentos')
              .select('id, aluno_id, professor_id, inicio, alunos(id, nome, classificacao, alertas, ultimo_acesso)')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setAtendimentos((prev) =>
                prev.some((a) => a.id === data.id) ? prev : [...prev, data as unknown as AtendimentoAberto],
              )
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [supabase])

  function aoAlocado(professor: Professor, alunoId: string, aluno: AlunoResumo) {
    // Otimista: o INSERT do realtime também vai chegar, mas isso evita esperar o round-trip.
    setAtendimentos((prev) => [
      ...prev,
      {
        id: `otimista-${alunoId}`,
        aluno_id: alunoId,
        professor_id: professor.id,
        inicio: new Date().toISOString(),
        alunos: aluno,
      },
    ])
    setAlocandoPara(null)
  }

  async function aoFinalizar(atendimentoId: string) {
    setAtendimentos((prev) => prev.filter((a) => a.id !== atendimentoId))
    await finalizarAtendimento(atendimentoId)
  }

  return (
    <div className="relative min-h-[70vh] w-full flex-1 overflow-auto bg-gray-50 p-4">
      {professores.map((professor, indice) => {
        const atendimento = atendimentos.find((a) => a.professor_id === professor.id)
        const grade = posicaoGrade(indice)
        const pos = {
          x: Number.isFinite(professor.pos_x) ? (professor.pos_x as number) : grade.x,
          y: Number.isFinite(professor.pos_y) ? (professor.pos_y as number) : grade.y,
        }

        return (
          <CardProfessor
            key={professor.id}
            professor={professor}
            pos={pos}
            atendimento={atendimento}
            agora={agora}
            onMover={(x, y) =>
              setProfessores((prev) =>
                prev.map((p) => (p.id === professor.id ? { ...p, pos_x: x, pos_y: y } : p)),
              )
            }
            onSoltar={(x, y) => void atualizarPosicaoProfessor(professor.id, x, y)}
            onAlocar={() => setAlocandoPara(professor)}
            onFinalizar={() => atendimento && void aoFinalizar(atendimento.id)}
          />
        )
      })}

      {professores.length === 0 && (
        <p className="text-sm text-gray-400">
          Nenhum professor ativo. Cadastre professores para vê-los aqui.
        </p>
      )}

      {alocandoPara && (
        <BuscarAluno
          professor={alocandoPara}
          onFechar={() => setAlocandoPara(null)}
          onAlocado={(alunoId, aluno) => aoAlocado(alocandoPara, alunoId, aluno)}
        />
      )}
    </div>
  )
}

function CardProfessor({
  professor,
  pos,
  atendimento,
  agora,
  onMover,
  onSoltar,
  onAlocar,
  onFinalizar,
}: {
  professor: Professor
  pos: { x: number; y: number }
  atendimento: AtendimentoAberto | undefined
  agora: number
  onMover: (x: number, y: number) => void
  onSoltar: (x: number, y: number) => void
  onAlocar: () => void
  onFinalizar: () => void
}) {
  const arrastando = useRef(false)
  const offset = useRef({ dx: 0, dy: 0 })
  const posAtual = useRef(pos)
  const cabecalhoRef = useRef<HTMLDivElement>(null)
  posAtual.current = pos

  // Números válidos, com fallback pra posição atual — nunca deixa NaN virar `left`/`top`.
  function numeroSeguro(valor: number, fallback: number) {
    return Number.isFinite(valor) ? valor : fallback
  }

  function aoPointerDown(e: React.PointerEvent) {
    // Captura no cabeçalho (elemento estável), nunca em e.target — se o clique
    // cair na <Image>, ela pode trocar de nó DOM e derrubar a captura no meio do arrasto.
    cabecalhoRef.current?.setPointerCapture(e.pointerId)
    arrastando.current = true
    offset.current = {
      dx: e.clientX - posAtual.current.x,
      dy: e.clientY - posAtual.current.y,
    }
  }

  function aoPointerMove(e: React.PointerEvent) {
    if (!arrastando.current) return
    const x = numeroSeguro(e.clientX - offset.current.dx, posAtual.current.x)
    const y = numeroSeguro(e.clientY - offset.current.dy, posAtual.current.y)
    onMover(Math.max(0, x), Math.max(0, y))
  }

  function aoPointerUp() {
    if (!arrastando.current) return
    arrastando.current = false
    onSoltar(posAtual.current.x, posAtual.current.y)
  }

  // Se o navegador soltar a captura sozinho (ex.: troca de janela no meio do
  // arrasto), encerra o drag em vez de deixar o estado "preso" arrastando.
  function aoPerderCaptura() {
    if (!arrastando.current) return
    arrastando.current = false
    onSoltar(posAtual.current.x, posAtual.current.y)
  }

  const ocupado = Boolean(atendimento)

  return (
    <div
      className="absolute rounded-lg border border-gray-200 bg-white shadow-sm"
      style={{ left: pos.x, top: pos.y, width: LARGURA_CARD }}
    >
      <div
        ref={cabecalhoRef}
        onPointerDown={aoPointerDown}
        onPointerMove={aoPointerMove}
        onPointerUp={aoPointerUp}
        onLostPointerCapture={aoPerderCaptura}
        className="flex cursor-grab items-center gap-2 rounded-t-lg border-b border-gray-100 bg-gray-50 px-3 py-2 active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200">
          {professor.foto_url ? (
            <Image src={professor.foto_url} alt={professor.nome} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-500">
              {professor.nome.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{professor.nome}</p>
          {professor.funcao && <p className="truncate text-xs text-gray-500">{professor.funcao}</p>}
        </div>
        <span
          className={`ml-auto h-2.5 w-2.5 shrink-0 rounded-full ${ocupado ? 'bg-red-500' : 'bg-green-500'}`}
          title={ocupado ? 'Ocupado' : 'Livre'}
        />
      </div>

      <div className="p-3">
        {atendimento ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-gray-900">{atendimento.alunos.nome}</p>
              <span
                className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[atendimento.alunos.classificacao].classe}`}
              >
                {atendimento.alunos.classificacao}
              </span>
            </div>
            {atendimento.alunos.alertas?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {atendimento.alunos.alertas.map((a) => (
                  <span key={a} className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-800">
                    {a}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Em atendimento há {formatarDecorrido(atendimento.inicio, agora)}
            </p>
            <button
              onClick={onFinalizar}
              className="mt-2 w-full rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              Finalizar atendimento
            </button>
          </div>
        ) : (
          <button
            onClick={onAlocar}
            className="w-full rounded-md border border-dashed border-gray-300 px-3 py-3 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            + Alocar aluno
          </button>
        )}
      </div>
    </div>
  )
}