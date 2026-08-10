'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES, TIPOS_INTERVALO, TIPOS_TAREFA, diasDesde, hojeISO } from '@/lib/utils'
import type {
  AlunoResumo,
  AtendimentoAberto,
  IntervaloAberto,
  Professor,
  TarefaDoDia,
  TipoIntervalo,
  TipoTarefa,
} from '@/lib/tipos'
import {
  atualizarPosicaoProfessor,
  finalizarAtendimento,
  finalizarIntervalo,
  iniciarIntervalo,
  removerProfessorDaSala,
} from './actions'
import { concluirTarefa, iniciarTarefa } from '@/app/tarefas/actions'
import { BuscarAluno } from './buscar-aluno'
import { BuscarProfessorParaSala } from './buscar-professor'
import { PerfilAlunoModal } from './perfil-aluno-modal'

const ALTURA_CARD = 480
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

function formatarDecorrido(inicioIso: string, agora: number) {
  return formatarDuracao(segundosDesde(inicioIso, agora))
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Alerta de tempo de atendimento: normal até 49min, amarelo aos 50min,
// vermelho na 1h — ajuda a recepção a notar sozinha quem já passou do
// tempo, sem precisar ficar de olho o tempo todo em cada card.
function classeTextoDuracao(totalSeg: number): string {
  const min = totalSeg / 60
  if (min >= 60) return 'text-red-600 font-semibold'
  if (min >= 50) return 'text-yellow-700 font-semibold'
  return 'text-gray-400 dark:text-gray-500'
}

function classeCardDuracao(totalSeg: number): string {
  const min = totalSeg / 60
  if (min >= 60) return 'border-red-300 bg-red-50'
  if (min >= 50) return 'border-yellow-300 bg-yellow-50'
  return 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'
}

export function PainelSala({
  professoresIniciais,
  atendimentosIniciais,
  intervalosIniciais,
  tarefasIniciais,
}: {
  professoresIniciais: Professor[]
  atendimentosIniciais: AtendimentoAberto[]
  intervalosIniciais: IntervaloAberto[]
  tarefasIniciais: TarefaDoDia[]
}) {
  const supabase = useMemo(() => criarClienteBrowser(), [])
  const hoje = useMemo(() => hojeISO(), [])
  const [professores, setProfessores] = useState(professoresIniciais)
  const [atendimentos, setAtendimentos] = useState(atendimentosIniciais)
  const [intervalos, setIntervalos] = useState(intervalosIniciais)
  const [tarefas, setTarefas] = useState(tarefasIniciais)
  const [alocandoPara, setAlocandoPara] = useState<Professor | null>(null)
  const [verPerfilAlunoId, setVerPerfilAlunoId] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const { colunas, larguraCard, larguraUtil } = useLayoutCanvas()

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    // Depois de uma queda de conexão (wifi, notebook que hibernou, aba em
    // segundo plano), o realtime reconecta sozinho mas NÃO reenvia os
    // eventos perdidos durante a queda — a tela ficava com contagem
    // desatualizada pra sempre até alguém dar F5. Por isso, toda vez que o
    // canal volta a ficar "SUBSCRIBED" depois de já ter caído uma vez,
    // busca tudo de novo do banco e substitui o estado local.
    let jaConectouAntes = false

    async function ressincronizar() {
      setSincronizando(true)
      const [
        { data: professoresNovos },
        { data: atendimentosNovos },
        { data: intervalosNovos },
        { data: tarefasNovas },
      ] = await Promise.all([
        supabase.from('professores').select('*').eq('ativo', true).eq('em_sala', true).order('nome'),
        supabase
          .from('atendimentos')
          .select(
            'id, aluno_id, professor_id, inicio, tarefa, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes)',
          )
          .is('fim', null),
        supabase.from('lanches').select('id, professor_id, tipo, inicio').is('fim', null),
        supabase
          .from('tarefas')
          .select('id, aluno_id, professor_id, tipo, status, observacao, inicio, fim, alunos(id, nome)')
          .eq('data', hoje)
          .neq('status', 'cancelada')
          .order('created_at'),
      ])
      if (professoresNovos) setProfessores(professoresNovos as Professor[])
      if (atendimentosNovos) setAtendimentos(atendimentosNovos as unknown as AtendimentoAberto[])
      if (intervalosNovos) setIntervalos(intervalosNovos as IntervaloAberto[])
      if (tarefasNovas) setTarefas(tarefasNovas as unknown as TarefaDoDia[])
      setSincronizando(false)
    }

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
            setAtendimentos((prev) => prev.filter((a) => a.id !== payload.new.id))
            return
          }
          if (payload.eventType === 'INSERT' && !payload.new.fim) {
            const { data } = await supabase
              .from('atendimentos')
              .select('id, aluno_id, professor_id, inicio, tarefa, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes)')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setAtendimentos((prev) => {
                const outros = prev.filter((a) => a.aluno_id !== data.aluno_id)
                return [...outros, data as unknown as AtendimentoAberto]
              })
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lanches' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.fim) {
            setIntervalos((prev) => prev.filter((i) => i.id !== payload.new.id))
            return
          }
          if (payload.eventType === 'INSERT' && !payload.new.fim) {
            const novo = payload.new as IntervaloAberto
            setIntervalos((prev) => (prev.some((i) => i.id === novo.id) ? prev : [...prev, novo]))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tarefas' },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setTarefas((prev) => prev.filter((t) => t.id !== payload.old.id))
            return
          }
          if (payload.new.data !== hoje || payload.new.status === 'cancelada') {
            setTarefas((prev) => prev.filter((t) => t.id !== payload.new.id))
            return
          }
          const { data } = await supabase
            .from('tarefas')
            .select('id, aluno_id, professor_id, tipo, status, observacao, inicio, fim, alunos(id, nome)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setTarefas((prev) => {
              const outras = prev.filter((t) => t.id !== data.id)
              return [...outras, data as unknown as TarefaDoDia]
            })
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (jaConectouAntes) void ressincronizar()
          jaConectouAntes = true
        }
      })

    return () => {
      supabase.removeChannel(canal)
    }
  }, [supabase, hoje])

  function aoAlocado(
    professor: Professor,
    alunoId: string,
    aluno: AlunoResumo,
    tarefa: TipoTarefa | null,
  ) {
    setAtendimentos((prev) => [
      ...prev,
      {
        id: `otimista-${alunoId}`,
        aluno_id: alunoId,
        professor_id: professor.id,
        inicio: new Date().toISOString(),
        tarefa,
        alunos: aluno,
      },
    ])
    setAlocandoPara(null)
  }

  async function aoConcluirTarefa(id: string) {
    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, fim: new Date().toISOString(), status: 'concluida' } : t)),
    )
    await concluirTarefa(id)
  }

  // Ao finalizar o atendimento, conclui junto qualquer tarefa de hoje desse
  // professor com esse mesmo aluno que ainda não tenha sido concluída —
  // evita ter que fechar a tarefa separadamente.
  async function aoFinalizar(atendimentoId: string) {
    setErroAcao(null)
    const atendimento = atendimentos.find((a) => a.id === atendimentoId)
    setAtendimentos((prev) => prev.filter((a) => a.id !== atendimentoId))
    const resultado = await finalizarAtendimento(atendimentoId)

    // Se o banco recusou (ex.: o card ainda era otimista e o id não existia
    // de verdade), o aluno tinha sumido da tela sem o atendimento ter sido
    // finalizado de fato — "finalizava sozinho antes da hora". Desfaz a
    // remoção otimista e avisa a recepção em vez de deixar isso invisível.
    if (resultado?.erro) {
      if (atendimento) setAtendimentos((prev) => [...prev, atendimento])
      setErroAcao(resultado.erro)
      return
    }

    if (atendimento) {
      const tarefasRelacionadas = tarefas.filter(
        (t) =>
          t.aluno_id === atendimento.aluno_id &&
          t.professor_id === atendimento.professor_id &&
          t.status !== 'concluida',
      )
      for (const t of tarefasRelacionadas) {
        await aoConcluirTarefa(t.id)
      }
    }
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
    setErroAcao(null)
    const anterior = professores
    setProfessores((prev) => prev.filter((p) => p.id !== professor.id))
    const resultado = await removerProfessorDaSala(professor.id)
    if (resultado?.erro) {
      setProfessores(anterior)
      setErroAcao(resultado.erro)
    }
  }

  async function aoIniciarTarefa(id: string) {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, inicio: new Date().toISOString() } : t)))
    await iniciarTarefa(id)
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <BuscarProfessorParaSala
          idsNaSala={professores.map((p) => p.id)}
          onAdicionado={aoAdicionarProfessor}
        />
        {erroAcao && <p className="mt-2 text-sm text-red-600">{erroAcao}</p>}
        {sincronizando && (
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Reconectando e atualizando a sala…</p>
        )}
      </div>

      <div className="relative min-h-[70vh] w-full flex-1 overflow-auto bg-gray-50 dark:bg-gray-800 p-4">
        {professores.map((professor, indice) => {
          const atendimentosDoProfessor = atendimentos.filter((a) => a.professor_id === professor.id)
          const intervalo = intervalos.find((i) => i.professor_id === professor.id)
          const tarefasDoProfessor = tarefas.filter(
            (t) => t.professor_id === professor.id && t.status !== 'concluida',
          )
          const grade = posicaoGrade(indice, colunas, larguraCard)
          const posBruta = {
            x: Number.isFinite(professor.pos_x) ? (professor.pos_x as number) : grade.x,
            y: Number.isFinite(professor.pos_y) ? (professor.pos_y as number) : grade.y,
          }
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
              atendimentosDoProfessor={atendimentosDoProfessor}
              intervalo={intervalo}
              tarefasDoProfessor={tarefasDoProfessor}
              agora={agora}
              onMover={(x, y) =>
                setProfessores((prev) =>
                  prev.map((p) => (p.id === professor.id ? { ...p, pos_x: x, pos_y: y } : p)),
                )
              }
              onSoltar={(x, y) => void atualizarPosicaoProfessor(professor.id, x, y)}
              onAlocar={() => setAlocandoPara(professor)}
              onFinalizar={(atendimentoId) => void aoFinalizar(atendimentoId)}
              onIniciarIntervalo={(tipo) => void aoIniciarIntervalo(professor, tipo)}
              onFinalizarIntervalo={() => intervalo && void aoFinalizarIntervalo(intervalo.id)}
              onRemoverDaSala={() => void aoRemoverDaSala(professor)}
              onIniciarTarefa={(id) => void aoIniciarTarefa(id)}
              onConcluirTarefa={(id) => void aoConcluirTarefa(id)}
              onVerPerfil={(alunoId) => setVerPerfilAlunoId(alunoId)}
            />
          )
        })}

        {professores.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Nenhum professor na sala ainda. Use a busca acima para adicionar.
          </p>
        )}

        {alocandoPara && (
          <BuscarAluno
            professor={alocandoPara}
            onFechar={() => setAlocandoPara(null)}
            onAlocado={(alunoId, aluno, tarefa) => aoAlocado(alocandoPara, alunoId, aluno, tarefa)}
          />
        )}

        {verPerfilAlunoId && (
          <PerfilAlunoModal alunoId={verPerfilAlunoId} onFechar={() => setVerPerfilAlunoId(null)} />
        )}
      </div>
    </div>
  )
}

function CardProfessor({
  professor,
  pos,
  larguraCard,
  atendimentosDoProfessor,
  intervalo,
  tarefasDoProfessor,
  agora,
  onMover,
  onSoltar,
  onAlocar,
  onFinalizar,
  onIniciarIntervalo,
  onFinalizarIntervalo,
  onRemoverDaSala,
  onIniciarTarefa,
  onConcluirTarefa,
  onVerPerfil,
}: {
  professor: Professor
  pos: { x: number; y: number }
  larguraCard: number
  atendimentosDoProfessor: AtendimentoAberto[]
  intervalo: IntervaloAberto | undefined
  tarefasDoProfessor: TarefaDoDia[]
  agora: number
  onMover: (x: number, y: number) => void
  onSoltar: (x: number, y: number) => void
  onAlocar: () => void
  onFinalizar: (atendimentoId: string) => void
  onIniciarIntervalo: (tipo: TipoIntervalo) => void
  onFinalizarIntervalo: () => void
  onRemoverDaSala: () => void
  onIniciarTarefa: (id: string) => void
  onConcluirTarefa: (id: string) => void
  onVerPerfil: (alunoId: string) => void
}) {
  const arrastando = useRef(false)
  const offset = useRef({ dx: 0, dy: 0 })
  const posAtual = useRef(pos)
  const cabecalhoRef = useRef<HTMLDivElement>(null)
  const [menuIntervaloAberto, setMenuIntervaloAberto] = useState(false)
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

  const ocupado = atendimentosDoProfessor.length > 0
  const emIntervalo = Boolean(intervalo)
  const baseVagas = Math.max(2, atendimentosDoProfessor.length)
  const totalVagas = baseVagas + extras

  return (
    <div
      className="absolute rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
      style={{ left: pos.x, top: pos.y, width: larguraCard }}
    >
      <div
        ref={cabecalhoRef}
        onPointerDown={aoPointerDown}
        onPointerMove={aoPointerMove}
        onPointerUp={aoPointerUp}
        onLostPointerCapture={aoPerderCaptura}
        className="flex cursor-grab items-center gap-2 rounded-t-lg border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-3 py-2 active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          {professor.foto_url ? (
            <Image src={professor.foto_url} alt={professor.nome} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {professor.nome.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{professor.nome}</p>
          {professor.funcao && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{professor.funcao}</p>}
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
            title={ocupado ? 'Finalize os atendimentos antes de remover' : 'Remover da sala'}
            className="rounded p-0.5 text-gray-300 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {emIntervalo ? (
        <div className="p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{TIPOS_INTERVALO[intervalo!.tipo]}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Início: {formatarHora(intervalo!.inicio)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Duração: {formatarDecorrido(intervalo!.inicio, agora)}</p>
          <button
            onClick={onFinalizarIntervalo}
            className="mt-2 w-full rounded-md bg-gray-900 dark:bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:hover:bg-brand-600"
          >
            Encerrar intervalo
          </button>
        </div>
      ) : (
        <>
          {tarefasDoProfessor.length > 0 && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto border-b border-gray-100 dark:border-gray-800 p-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tarefas de hoje</p>
              {tarefasDoProfessor.map((t) => {
                const emAndamento = Boolean(t.inicio) && !t.fim
                return (
                  <div key={t.id} className="rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-2">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                      {TIPOS_TAREFA[t.tipo]}
                    </span>
                    <p className="mt-1 truncate text-xs font-medium text-gray-900 dark:text-gray-100">{t.alunos.nome}</p>
                    {t.observacao && <p className="text-xs text-gray-500 dark:text-gray-400">{t.observacao}</p>}
                    {emAndamento && (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Em andamento há {formatarDecorrido(t.inicio!, agora)}
                      </p>
                    )}
                    <div className="mt-1.5 flex gap-1.5">
                      {!t.inicio && (
                        <button
                          onClick={() => onIniciarTarefa(t.id)}
                          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                        >
                          Iniciar
                        </button>
                      )}
                      <button
                        onClick={() => onConcluirTarefa(t.id)}
                        className="flex-1 rounded-md bg-gray-900 dark:bg-brand-500 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800 dark:hover:bg-brand-600"
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="max-h-64 space-y-2 overflow-y-auto p-3">
            {Array.from({ length: totalVagas }).map((_, i) => {
              const atendimentoDaVaga = atendimentosDoProfessor[i]

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
                // Card ainda não confirmado pelo banco (acabou de ser alocado,
                // esperando o evento realtime trocar pelo id de verdade). Se
                // finalizar agora, o UPDATE no banco falha (id não existe) e o
                // aluno some da tela sem o atendimento ter sido encerrado de
                // fato — por isso trava o botão até confirmar.
                const aindaConfirmando = atendimentoDaVaga.id.startsWith('otimista-')

                return (
                  <div
                    key={atendimentoDaVaga.id}
                    className={`rounded-md border p-2 ${classeCardDuracao(segundos)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => onVerPerfil(atendimentoDaVaga.aluno_id)}
                        className="truncate text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline"
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

                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Entrou às {formatarHora(atendimentoDaVaga.inicio)}</span>
                      {atendimentoDaVaga.tarefa && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                          {TIPOS_TAREFA[atendimentoDaVaga.tarefa]}
                        </span>
                      )}
                    </div>

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

                    {infoSecundaria && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{infoSecundaria}</p>}

                    <button
                      onClick={() => onFinalizar(atendimentoDaVaga.id)}
                      disabled={aindaConfirmando}
                      title={aindaConfirmando ? 'Aguarde a confirmação antes de finalizar' : undefined}
                      className="mt-2 w-full rounded-md bg-gray-900 dark:bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aindaConfirmando ? 'Confirmando…' : 'Finalizar atendimento'}
                    </button>
                  </div>
                )
              }

              const removivel = i >= baseVagas

              return (
                <div key={`vaga-${professor.id}-${i}`} className="flex items-center gap-1">
                  <button
                    onClick={onAlocar}
                    className="flex-1 rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    + Alocar aluno
                  </button>
                  {removivel && (
                    <button
                      onClick={() => setExtras((v) => Math.max(0, v - 1))}
                      title="Remover vaga"
                      className="shrink-0 rounded p-1.5 text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400"
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

          <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 p-3">
            <button
              onClick={() => setExtras((v) => v + 1)}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
            >
              + Adicionar vaga
            </button>

            {!ocupado && (
              <div className="relative">
                <button
                  onClick={() => setMenuIntervaloAberto((v) => !v)}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Iniciar intervalo
                </button>
                {menuIntervaloAberto && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                    {(Object.keys(TIPOS_INTERVALO) as TipoIntervalo[]).map((tipo) => (
                      <button
                        key={tipo}
                        onClick={() => {
                          setMenuIntervaloAberto(false)
                          onIniciarIntervalo(tipo)
                        }}
                        className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {TIPOS_INTERVALO[tipo]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
