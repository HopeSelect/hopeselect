'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES, diasDesde } from '@/lib/utils'
import type { AlunoResumo, AtendimentoFisioAberto, Fisioterapeuta } from '@/lib/tipos'
import { finalizarAtendimentoFisio } from './actions'
import { BuscarAlunoFisio } from './buscar-aluno-fisio'
import { PerfilAlunoModal } from '@/app/sala/perfil-aluno-modal'

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
  return 'text-gray-400 dark:text-gray-500'
}
function classeCardDuracao(totalSeg: number): string {
  const min = totalSeg / 60
  if (min >= 60) return 'border-red-300 bg-red-50'
  if (min >= 50) return 'border-yellow-300 bg-yellow-50'
  return 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'
}

export function PainelFisio({
  fisioterapeutasIniciais,
  atendimentosIniciais,
}: {
  fisioterapeutasIniciais: Fisioterapeuta[]
  atendimentosIniciais: AtendimentoFisioAberto[]
}) {
  const supabase = useMemo(() => criarClienteBrowser(), [])
  const [fisioterapeutas, setFisioterapeutas] = useState(fisioterapeutasIniciais)
  const [atendimentos, setAtendimentos] = useState(atendimentosIniciais)
  const [alocandoPara, setAlocandoPara] = useState<Fisioterapeuta | null>(null)
  const [verPerfilAlunoId, setVerPerfilAlunoId] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [extrasPorId, setExtrasPorId] = useState<Record<string, number>>({})

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const canal = supabase
      .channel('painel-fisio')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fisioterapeutas' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setFisioterapeutas((prev) => prev.filter((f) => f.id !== payload.old.id))
          return
        }
        const novo = payload.new as Fisioterapeuta
        setFisioterapeutas((prev) => {
          const existe = prev.some((f) => f.id === novo.id)
          if (!novo.ativo) return prev.filter((f) => f.id !== novo.id)
          return existe ? prev.map((f) => (f.id === novo.id ? { ...f, ...novo } : f)) : [...prev, novo]
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendimentos_fisioterapeuta' }, async (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.fim) {
          setAtendimentos((prev) => prev.filter((a) => a.id !== payload.new.id))
          return
        }
        if (payload.eventType === 'INSERT' && !payload.new.fim) {
          const { data } = await supabase
            .from('atendimentos_fisioterapeuta')
            .select(
              'id, aluno_id, fisioterapeuta_id, inicio, alunos(id, nome, classificacao, alertas, ultimo_acesso, restricoes, foto_url)',
            )
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setAtendimentos((prev) => {
              const outros = prev.filter((a) => a.aluno_id !== data.aluno_id)
              return [...outros, data as unknown as AtendimentoFisioAberto]
            })
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [supabase])

  function aoAlocado(fisioterapeuta: Fisioterapeuta, alunoId: string, aluno: AlunoResumo) {
    setAtendimentos((prev) => [
      ...prev,
      {
        id: `otimista-${alunoId}`,
        aluno_id: alunoId,
        fisioterapeuta_id: fisioterapeuta.id,
        inicio: new Date().toISOString(),
        alunos: aluno,
      },
    ])
    setAlocandoPara(null)
  }

  async function aoFinalizar(atendimentoId: string) {
    setAtendimentos((prev) => prev.filter((a) => a.id !== atendimentoId))
    await finalizarAtendimentoFisio(atendimentoId)
  }

  if (fisioterapeutas.length === 0) {
    return (
      <p className="p-4 text-sm text-gray-400 dark:text-gray-500">
        Nenhum fisioterapeuta cadastrado ainda. Cadastre em &quot;Novo fisioterapeuta&quot;, ao lado.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-4 p-4">
      {fisioterapeutas.map((fisioterapeuta) => {
        const atendimentosDoFisio = atendimentos.filter((a) => a.fisioterapeuta_id === fisioterapeuta.id)
        const extras = extrasPorId[fisioterapeuta.id] ?? 0
        const baseVagas = Math.max(2, atendimentosDoFisio.length)
        const totalVagas = baseVagas + extras
        const ocupado = atendimentosDoFisio.length > 0

        return (
          <div key={fisioterapeuta.id} className="w-64 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center gap-2 rounded-t-lg border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-3 py-2">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                {fisioterapeuta.foto_url ? (
                  <Image src={fisioterapeuta.foto_url} alt={fisioterapeuta.nome} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    {fisioterapeuta.nome.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{fisioterapeuta.nome}</p>
                {fisioterapeuta.horario_trabalho && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{fisioterapeuta.horario_trabalho}</p>
                )}
              </div>
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${ocupado ? 'bg-red-500' : 'bg-green-500'}`}
                title={ocupado ? 'Ocupado' : 'Livre'}
              />
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto p-3">
              {Array.from({ length: totalVagas }).map((_, i) => {
                const atendimentoDaVaga = atendimentosDoFisio[i]

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
                    <div key={atendimentoDaVaga.id} className={`rounded-md border p-2 ${classeCardDuracao(segundos)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setVerPerfilAlunoId(atendimentoDaVaga.aluno_id)}
                          className="truncate text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline"
                        >
                          {atendimentoDaVaga.alunos.nome}
                        </button>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${CLASSIFICACOES[atendimentoDaVaga.alunos.classificacao].classe}`}
                        >
                          {atendimentoDaVaga.alunos.classificacao}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Entrou às {formatarHora(atendimentoDaVaga.inicio)}</span>
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
                        onClick={() => void aoFinalizar(atendimentoDaVaga.id)}
                        className="mt-2 w-full rounded-md bg-gray-900 dark:bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:hover:bg-brand-600"
                      >
                        Finalizar atendimento
                      </button>
                    </div>
                  )
                }

                const removivel = i >= baseVagas
                return (
                  <div key={`vaga-${fisioterapeuta.id}-${i}`} className="flex items-center gap-1">
                    <button
                      onClick={() => setAlocandoPara(fisioterapeuta)}
                      className="flex-1 rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      + Alocar aluno
                    </button>
                    {removivel && (
                      <button
                        onClick={() =>
                          setExtrasPorId((prev) => ({
                            ...prev,
                            [fisioterapeuta.id]: Math.max(0, (prev[fisioterapeuta.id] ?? 0) - 1),
                          }))
                        }
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

            <div className="border-t border-gray-100 dark:border-gray-800 p-3">
              <button
                onClick={() =>
                  setExtrasPorId((prev) => ({ ...prev, [fisioterapeuta.id]: (prev[fisioterapeuta.id] ?? 0) + 1 }))
                }
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              >
                + Adicionar vaga
              </button>
            </div>
          </div>
        )
      })}

      {alocandoPara && (
        <BuscarAlunoFisio
          fisioterapeutaId={alocandoPara.id}
          fisioterapeutaNome={alocandoPara.nome}
          onFechar={() => setAlocandoPara(null)}
          onAlocado={(alunoId, aluno) => aoAlocado(alocandoPara, alunoId, aluno)}
        />
      )}

      {verPerfilAlunoId && <PerfilAlunoModal alunoId={verPerfilAlunoId} onFechar={() => setVerPerfilAlunoId(null)} />}
    </div>
  )
}
