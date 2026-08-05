'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES, TIPOS_ESPECIALISTA, diasDesde } from '@/lib/utils'
import type { AlunoResumo, Especialista } from '@/lib/tipos'
import { atualizarPosicaoEspecialista, finalizarAtendimentoEspecialista, removerEspecialistaDaSala } from './actions'
import { BuscarAlunoEspecialista } from './buscar-aluno-especialista'
import { BuscarEspecialistaParaSala } from './buscar-especialista'
import { PerfilAlunoModal } from '@/app/sala/perfil-aluno-modal'

export interface AtendimentoEspecialistaAberto {
  id: string
  aluno_id: string
  especialista_id: string
  inicio: string
  alunos: AlunoResumo
}

const ALTURA_CARD = 340
const GAP = 16
const LARGURA_CARD_MIN = 168
const LARGURA_CARD_MAX = 240

function useLayoutCanvas() {
  const [larguraJanela, setLarguraJanela] = useState<number>(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  )

  useEffect(() => {
    function aoRedimensionar() {
      setLarguraJanela(window.innerWidth)
    }
    aoRedimensionar()
    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [])

  const larguraUtil = Math.max(larguraJanela - GAP * 2, LARGURA_CARD_MIN)

  const colunas =
    larguraJanela < 480 ? 1 : larguraJanela < 768 ? 2 : larguraJanela < 1100 ? 3 : larguraJanela < 1400 ? 4 : 5

  const larguraCard = Math.min(
    LARGURA_CARD_MAX,
    Math.max(LARGURA_CARD_MIN, Math.floor((larguraUtil - (colunas - 1) * GAP) / colunas)),
  )

  return { colunas, larguraCard, larguraUtil }
}

function posicaoGrade(indice: number, colunas: number, larguraCard: number) {
  return {
    x: GAP + (indice % colunas) * (larguraCard + GAP),
    y: GAP + Math.floor(indice / colunas) * (ALTURA_CARD + GAP),
  }
}

function segundosDesde(inicioIso: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(inicioIso).getTime()) / 1000))
}

function formatarDuracao(totalSeg: number) {
  const h = Math.floor(totalSeg / 3600)
  const m = Math.floor((totalSeg % 3600) / 60)
  const s = totalSeg % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function classeTextoDuracao(totalSeg: number): string {
  const min = totalSeg / 60
  if (min >= 60) return 'text-red-600 font-semibold'
  if (min >= 50) return 'text-yellow-700 font-semibold'
  return 'text-gray-400'
}

function classeCardDuracao(totalSeg: number): string {
  const min = totalSeg / 60
  if (min >= 60) return 'border-red-300 bg-red-50'
  if (min >= 50) return 'border-yellow-300 bg-yellow-50'
  return 'border-gray-100 bg-gray-50'
}

export function PainelSalaEspecialistas({
  especialistasIniciais,
  atendimentosIniciais,
}: {
  especialistasIniciais: Especialista[]
  atendimentosIniciais: AtendimentoEspecialistaAberto[]
}) {
  const supabase = useMemo(() => criarClienteBrowser(), [])
  const [especialistas, setEspecialistas] = useState(especialistasIniciais)
  const [atendimentos, setAtendimentos] = useState(atendimentosIniciais)
  const [alocandoPara, setAlocandoPara] = useState<Especialista | null>(null)
  const [verPerfilAlunoId, setVerPerfilAlunoId] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [erroRemocao, setErroRemocao] = useState<string | null>(null)
  const { colunas, larguraCard, larguraUtil } = useLayoutCanvas()

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const canal = supabase
      .channel('painel-sala-especialistas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'especialistas' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setEspecialistas((prev) => prev.filter((e) => e.id !== payload.old.id))
            return
          }
          const novo = payload.new as Especialista
          setEspecialistas((prev) => {
            const existe = prev.some((e) => e.id === novo.id)
            if (!novo.ativo || !novo.em_sala) return prev.filter((e) => e.id !== novo.id)
            return existe ? prev.map((e) => (e.id === novo.id ? { ...e, ...novo } : e)) : [...prev, novo]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atendimentos_especialista' },
        async (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.fim) {
            setAtendimentos((prev) => prev.filter((a) => a.id !== payload.new.id))
            return
          }
          if (payload.eventType === 'INSERT' && !payload.new.fim) {
            const { data } = await supabase
              .from('atendimentos_especialista')
              .select('id, aluno_id, especialista_id, inicio, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes, foto_url)')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setAtendimentos((prev) => {
                const outros = prev.filter((a) => a.aluno_id !== data.aluno_id)
                return [...outros, data as unknown as AtendimentoEspecialistaAberto]
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [supabase])

  function aoAlocado(especialista: Especialista, alunoId: string, aluno: AlunoResumo) {
    setAtendimentos((prev) => [
      ...prev,
      {
        id: `otimista-${alunoId}`,
        aluno_id: alunoId,
        especialista_id: especialista.id,
        inicio: new Date().toISOString(),
        alunos: aluno,
      },
    ])
    setAlocandoPara(null)
  }

  async function aoFinalizar(atendimentoId: string) {
    setAtendimentos((prev) => prev.filter((a) => a.id !== atendimentoId))
    await finalizarAtendimentoEspecialista(atendimentoId)
  }

  function aoAdicionarEspecialista(especialista: Especialista) {
    setEspecialistas((prev) => (prev.some((e) => e.id === especialista.id) ? prev : [...prev, especialista]))
  }

  async function aoRemoverDaSala(especialista: Especialista) {
    setErroRemocao(null)
    const anterior = especialistas
    setEspecialistas((prev) => prev.filter((e) => e.id !== especialista.id))
    const resultado = await removerEspecialistaDaSala(especialista.id)
    if (resultado?.erro) {
      setEspecialistas(anterior)
      setErroRemocao(resultado.erro)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <BuscarEspecialistaParaSala
          idsNaSala={especialistas.map((e) => e.id)}
          onAdicionado={aoAdicionarEspecialista}
        />
        {erroRemocao && <p className="mt-2 text-sm text-red-600">{erroRemocao}</p>}
      </div>

      <div className="relative min-h-[70vh] w-full flex-1 overflow-auto bg-gray-50 p-4">
        {especialistas.map((especialista, indice) => {
          const atendimentosDoEspecialista = atendimentos.filter((a) => a.especialista_id === especialista.id)
          const grade = posicaoGrade(indice, colunas, larguraCard)
          const posBruta = {
            x: Number.isFinite(especialista.pos_x) ? (especialista.pos_x as number) : grade.x,
            y: Number.isFinite(especialista.pos_y) ? (especialista.pos_y as number) : grade.y,
          }
          const pos = {
            x: Math.min(posBruta.x, Math.max(GAP, larguraUtil - larguraCard)),
            y: posBruta.y,
          }

          return (
            <CardEspecialista
              key={especialista.id}
              especialista={especialista}
              pos={pos}
              larguraCard={larguraCard}
              atendimentosDoEspecialista={atendimentosDoEspecialista}
              agora={agora}
              onMover={(x, y) =>
                setEspecialistas((prev) =>
                  prev.map((e) => (e.id === especialista.id ? { ...e, pos_x: x, pos_y: y } : e)),
                )
              }
              onSoltar={(x, y) => void atualizarPosicaoEspecialista(especialista.id, x, y)}
              onAlocar={() => setAlocandoPara(especialista)}
              onFinalizar={(atendimentoId) => void aoFinalizar(atendimentoId)}
              onRemoverDaSala={() => void aoRemoverDaSala(especialista)}
              onVerPerfil={(alunoId) => setVerPerfilAlunoId(alunoId)}
            />
          )
        })}

        {especialistas.length === 0 && (
          <p className="text-sm text-gray-400">
            Nenhum especialista na sala ainda. Use a busca acima para adicionar.
          </p>
        )}

        {alocandoPara && (
          <BuscarAlunoEspecialista
            especialista={alocandoPara}
            onFechar={() => setAlocandoPara(null)}
            onAlocado={(alunoId, aluno) => aoAlocado(alocandoPara, alunoId, aluno)}
          />
        )}

        {verPerfilAlunoId && (
          <PerfilAlunoModal alunoId={verPerfilAlunoId} onFechar={() => setVerPerfilAlunoId(null)} />
        )}
      </div>
    </div>
  )
}

function CardEspecialista({
  especialista,
  pos,
  larguraCard,
  atendimentosDoEspecialista,
  agora,
  onMover,
  onSoltar,
  onAlocar,
  onFinalizar,
  onRemoverDaSala,
  onVerPerfil,
}: {
  especialista: Especialista
  pos: { x: number; y: number }
  larguraCard: number
  atendimentosDoEspecialista: AtendimentoEspecialistaAberto[]
  agora: number
  onMover: (x: number, y: number) => void
  onSoltar: (x: number, y: number) => void
  onAlocar: () => void
  onFinalizar: (atendimentoId: string) => void
  onRemoverDaSala: () => void
  onVerPerfil: (alunoId: string) => void
}) {
  const arrastando = useRef(false)
  const offset = useRef({ dx: 0, dy: 0 })
  const posAtual = useRef(pos)
  const cabecalhoRef = useRef<HTMLDivElement>(null)
  const [extras, setExtras] = useState(0)
  posAtual.current = pos

  function numeroSeguro(valor: number, fallback: number) {
    return Number.isFinite(valor) ? valor : fallback
  }

  function aoPointerDown(e: React.PointerEvent) {
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

  function aoPerderCaptura() {
    if (!arrastando.current) return
    arrastando.current = false
    onSoltar(posAtual.current.x, posAtual.current.y)
  }

  const ocupado = atendimentosDoEspecialista.length > 0
  const baseVagas = Math.max(2, atendimentosDoEspecialista.length)
  const totalVagas = baseVagas + extras

  return (
    <div
      className="absolute rounded-lg border border-gray-200 bg-white shadow-sm"
      style={{ left: pos.x, top: pos.y, width: larguraCard }}
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
          {especialista.foto_url ? (
            <Image src={especialista.foto_url} alt={especialista.nome} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-500">
              {especialista.nome.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{especialista.nome}</p>
          <p className="truncate text-xs text-gray-500">{TIPOS_ESPECIALISTA[especialista.tipo]}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${ocupado ? 'bg-red-500' : 'bg-green-500'}`}
            title={ocupado ? 'Ocupado' : 'Livre'}
          />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemoverDaSala}
            disabled={ocupado}
            title={ocupado ? 'Finalize os atendimentos antes de remover' : 'Remover da sala'}
            className="rounded p-0.5 text-gray-300 hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {Array.from({ length: totalVagas }).map((_, i) => {
          const atendimentoDaVaga = atendimentosDoEspecialista[i]

          if (atendimentoDaVaga) {
            const dias = diasDesde(atendimentoDaVaga.alunos.ultimo_acesso)
            const infoSecundaria = [
              dias === null ? null : `Último acesso há ${dias} dia${dias === 1 ? '' : 's'}`,
              atendimentoDaVaga.alunos.restricoes,
            ]
              .filter(Boolean)
              .join(' · ')

            const segundos = segundosDesde(atendimentoDaVaga.inicio, agora)
            const excedeu1h = segundos / 60 >= 60

            return (
              <div
                key={atendimentoDaVaga.id}
                className={`rounded-md border p-2 ${classeCardDuracao(segundos)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onVerPerfil(atendimentoDaVaga.aluno_id)}
                    className="truncate text-left text-sm font-medium text-gray-900 hover:underline"
                    title="Ver ficha do aluno"
                  >
                    {atendimentoDaVaga.alunos.nome}
                  </button>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[atendimentoDaVaga.alunos.classificacao].classe}`}
                  >
                    {atendimentoDaVaga.alunos.classificacao}
                  </span>
                </div>

                <span className="text-xs text-gray-400">Entrou às {formatarHora(atendimentoDaVaga.inicio)}</span>

                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className={`text-xs ${classeTextoDuracao(segundos)}`}>
                    Duração: {formatarDuracao(segundos)}
                  </span>
                  {excedeu1h && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                      Excedeu 1h
                    </span>
                  )}
                </div>

                {atendimentoDaVaga.alunos.alertas?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {atendimentoDaVaga.alunos.alertas.map((a) => (
                      <span key={a} className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-800">
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {infoSecundaria && <p className="mt-1 text-xs text-gray-400">{infoSecundaria}</p>}

                <button
                  onClick={() => onFinalizar(atendimentoDaVaga.id)}
                  className="mt-2 w-full rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Finalizar atendimento
                </button>
              </div>
            )
          }

          const removivel = i >= baseVagas

          return (
            <div key={`vaga-${especialista.id}-${i}`} className="flex items-center gap-1">
              <button
                onClick={onAlocar}
                className="flex-1 rounded-md border border-dashed border-gray-300 px-3 py-3 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                + Alocar aluno
              </button>
              {removivel && (
                <button
                  onClick={() => setExtras((v) => Math.max(0, v - 1))}
                  title="Remover vaga"
                  className="shrink-0 rounded p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-2 border-t border-gray-100 p-3">
        <button
          onClick={() => setExtras((v) => v + 1)}
          className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600"
        >
          + Adicionar vaga
        </button>
      </div>
    </div>
  )
}