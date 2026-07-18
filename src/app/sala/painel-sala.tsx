'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES, TIPOS_INTERVALO } from '@/lib/utils'
import type { AlunoResumo, AtendimentoAberto, IntervaloAberto, Professor, TipoIntervalo } from '@/lib/tipos'
import {
  atualizarPosicaoProfessor,
  finalizarAtendimento,
  finalizarIntervalo,
  iniciarIntervalo,
  removerProfessorDaSala,
} from './actions'
import { BuscarAluno } from './buscar-aluno'
import { BuscarProfessorParaSala } from './buscar-professor'

const ALTURA_CARD = 168
const GAP = 16
const LARGURA_CARD_MIN = 168
const LARGURA_CARD_MAX = 240

// Antes: COLUNAS e LARGURA_CARD eram constantes fixas (5 colunas, 240px),
// o que exigia ~1300px de largura só pra caber a primeira linha de cards.
// Num celular isso obrigava scroll horizontal constante pra tela mais usada
// do sistema. Agora colunas e largura do card são calculadas a partir da
// largura real da tela (ver useLayoutCanvas), então o grid inicial sempre
// cabe na viewport — o "canvas arrastável" continua existindo (é requisito
// do cliente), só a disposição inicial que se adapta.
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

  // p-4 do container = 16px de cada lado
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

function formatarDecorrido(inicioIso: string, agora: number) {
  const ms = Math.max(0, agora - new Date(inicioIso).getTime())
  const totalSeg = Math.floor(ms / 1000)
  const h = Math.floor(totalSeg / 3600)
  const m = Math.floor((totalSeg % 3600) / 60)
  const s = totalSeg % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function PainelSala({
  professoresIniciais,
  atendimentosIniciais,
  intervalosIniciais,
}: {
  professoresIniciais: Professor[]
  atendimentosIniciais: AtendimentoAberto[]
  intervalosIniciais: IntervaloAberto[]
}) {
  const supabase = useMemo(() => criarClienteBrowser(), [])
  const [professores, setProfessores] = useState(professoresIniciais)
  const [atendimentos, setAtendimentos] = useState(atendimentosIniciais)
  const [intervalos, setIntervalos] = useState(intervalosIniciais)
  const [alocandoPara, setAlocandoPara] = useState<Professor | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [erroRemocao, setErroRemocao] = useState<string | null>(null)
  const { colunas, larguraCard, larguraUtil } = useLayoutCanvas()

  // Relógio para os cronômetros dos cards (atualiza a cada 30s, sem revalidar dados).
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Realtime: professores (posição do card), atendimentos (aloca/finaliza)
  // e lanches (início/fim de intervalo -> bolinha amarela).
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
            if (!novo.ativo || !novo.em_sala) return prev.filter((p) => p.id !== novo.id)
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lanches' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.fim) {
            // Intervalo encerrado -> bolinha some.
            setIntervalos((prev) => prev.filter((i) => i.id !== payload.new.id))
            return
          }
          if (payload.eventType === 'INSERT' && !payload.new.fim) {
            const novo = payload.new as IntervaloAberto
            setIntervalos((prev) => (prev.some((i) => i.id === novo.id) ? prev : [...prev, novo]))
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

  async function aoIniciarIntervalo(professor: Professor, tipo: TipoIntervalo) {
    const idOtimista = `otimista-${professor.id}`
    setIntervalos((prev) => [
      ...prev,
      { id: idOtimista, professor_id: professor.id, tipo, inicio: new Date().toISOString() },
    ])
    await iniciarIntervalo(professor.id, tipo)
  }

  async function aoFinalizarIntervalo(intervaloId: string) {
    setIntervalos((prev) => prev.filter((i) => i.id !== intervaloId))
    await finalizarIntervalo(intervaloId)
  }

  function aoAdicionarProfessor(professor: Professor) {
    setProfessores((prev) => (prev.some((p) => p.id === professor.id) ? prev : [...prev, professor]))
  }

  async function aoRemoverDaSala(professor: Professor) {
    setErroRemocao(null)
    const anterior = professores
    setProfessores((prev) => prev.filter((p) => p.id !== professor.id))
    const resultado = await removerProfessorDaSala(professor.id)
    if (resultado?.erro) {
      setProfessores(anterior)
      setErroRemocao(resultado.erro)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <BuscarProfessorParaSala
          idsNaSala={professores.map((p) => p.id)}
          onAdicionado={aoAdicionarProfessor}
        />
        {erroRemocao && <p className="mt-2 text-sm text-red-600">{erroRemocao}</p>}
      </div>

      <div className="relative min-h-[70vh] w-full flex-1 overflow-auto bg-gray-50 p-4">
        {professores.map((professor, indice) => {
          const atendimento = atendimentos.find((a) => a.professor_id === professor.id)
          const intervalo = intervalos.find((i) => i.professor_id === professor.id)
          const grade = posicaoGrade(indice, colunas, larguraCard)
          const posBruta = {
            x: Number.isFinite(professor.pos_x) ? (professor.pos_x as number) : grade.x,
            y: Number.isFinite(professor.pos_y) ? (professor.pos_y as number) : grade.y,
          }
          // Clampa a posição salva (pode ter sido arrastada numa tela grande)
          // pra caber na largura atual — sem isso, um card arrastado pra
          // direita no desktop simplesmente some fora da viewport no celular.
          const pos = {
            x: Math.min(posBruta.x, Math.max(GAP, larguraUtil - larguraCard)),
            y: posBruta.y,
          }

          return (
            <CardProfessor
              key={professor.id}
              professor={professor}
              pos={pos}
              larguraCard={larguraCard}
              atendimento={atendimento}
              intervalo={intervalo}
              agora={agora}
              onMover={(x, y) =>
                setProfessores((prev) =>
                  prev.map((p) => (p.id === professor.id ? { ...p, pos_x: x, pos_y: y } : p)),
                )
              }
              onSoltar={(x, y) => void atualizarPosicaoProfessor(professor.id, x, y)}
              onAlocar={() => setAlocandoPara(professor)}
              onFinalizar={() => atendimento && void aoFinalizar(atendimento.id)}
              onIniciarIntervalo={(tipo) => void aoIniciarIntervalo(professor, tipo)}
              onFinalizarIntervalo={() => intervalo && void aoFinalizarIntervalo(intervalo.id)}
              onRemoverDaSala={() => void aoRemoverDaSala(professor)}
            />
          )
        })}

        {professores.length === 0 && (
          <p className="text-sm text-gray-400">
            Nenhum professor na sala ainda. Use a busca acima para adicionar.
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
    </div>
  )
}

function CardProfessor({
  professor,
  pos,
  larguraCard,
  atendimento,
  intervalo,
  agora,
  onMover,
  onSoltar,
  onAlocar,
  onFinalizar,
  onIniciarIntervalo,
  onFinalizarIntervalo,
  onRemoverDaSala,
}: {
  professor: Professor
  pos: { x: number; y: number }
  larguraCard: number
  atendimento: AtendimentoAberto | undefined
  intervalo: IntervaloAberto | undefined
  agora: number
  onMover: (x: number, y: number) => void
  onSoltar: (x: number, y: number) => void
  onAlocar: () => void
  onFinalizar: () => void
  onIniciarIntervalo: (tipo: TipoIntervalo) => void
  onFinalizarIntervalo: () => void
  onRemoverDaSala: () => void
}) {
  const arrastando = useRef(false)
  const offset = useRef({ dx: 0, dy: 0 })
  const posAtual = useRef(pos)
  const cabecalhoRef = useRef<HTMLDivElement>(null)
  const [menuIntervaloAberto, setMenuIntervaloAberto] = useState(false)
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
  const emIntervalo = Boolean(intervalo)

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
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              emIntervalo ? 'bg-yellow-400' : ocupado ? 'bg-red-500' : 'bg-green-500'
            }`}
            title={emIntervalo ? TIPOS_INTERVALO[intervalo!.tipo] : ocupado ? 'Ocupado' : 'Livre'}
          />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemoverDaSala}
            disabled={ocupado}
            title={ocupado ? 'Finalize o atendimento antes de remover' : 'Remover da sala'}
            className="rounded p-0.5 text-gray-300 hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-3">
        {emIntervalo ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{TIPOS_INTERVALO[intervalo!.tipo]}</p>
            <p className="mt-1 text-xs text-gray-400">
              Há {formatarDecorrido(intervalo!.inicio, agora)}
            </p>
            <button
              onClick={onFinalizarIntervalo}
              className="mt-2 w-full rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              Encerrar intervalo
            </button>
          </div>
        ) : atendimento ? (
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
          <div className="space-y-2">
            <button
              onClick={onAlocar}
              className="w-full rounded-md border border-dashed border-gray-300 px-3 py-3 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              + Alocar aluno
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuIntervaloAberto((v) => !v)}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                Iniciar intervalo
              </button>
              {menuIntervaloAberto && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
                  {(Object.keys(TIPOS_INTERVALO) as TipoIntervalo[]).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => {
                        setMenuIntervaloAberto(false)
                        onIniciarIntervalo(tipo)
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {TIPOS_INTERVALO[tipo]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
