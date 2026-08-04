'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES, diasDesde, diasParaAniversario, idadeDesde, statusPlano } from '@/lib/utils'
import type { AlunoComProfessor } from '@/lib/tipos'

interface LinhaHistorico {
  id: string
  data: string
  professor_nome: string
  duracao_hms: string
  em_andamento: boolean
}

export function PerfilAlunoModal({ alunoId, onFechar }: { alunoId: string; onFechar: () => void }) {
  const supabase = criarClienteBrowser()
  const [aluno, setAluno] = useState<AlunoComProfessor | null>(null)
  const [historico, setHistorico] = useState<LinhaHistorico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)

    async function carregar() {
      const [{ data, error }, { data: linhasHistorico }] = await Promise.all([
        supabase.from('alunos').select('*, professores(nome)').eq('id', alunoId).single(),
        supabase
          .from('vw_atendimentos')
          .select('id, data, professor_nome, duracao_hms, em_andamento')
          .eq('aluno_id', alunoId)
          .order('data', { ascending: false })
          .order('inicio', { ascending: false })
          .limit(10),
      ])
      if (cancelado) return
      if (error) setErro(error.message)
      setAluno((data as unknown as AlunoComProfessor) ?? null)
      setHistorico((linhasHistorico ?? []) as LinhaHistorico[])
      setCarregando(false)
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [alunoId, supabase])

  const dias = aluno ? diasDesde(aluno.ultimo_acesso) : null
  const idade = aluno ? idadeDesde(aluno.data_nascimento) : null
  const plano = aluno ? statusPlano(aluno.vencimento_plano) : null
  const diasAniversario = aluno ? diasParaAniversario(aluno.data_nascimento) : null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Ficha do aluno</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-700" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-4">
          {carregando && <p className="text-sm text-gray-400">Carregando…</p>}
          {erro && <p className="text-sm text-red-600">{erro}</p>}

          {aluno && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-lg font-semibold ${CLASSIFICACOES[aluno.classificacao].classe}`}
                  title={CLASSIFICACOES[aluno.classificacao].rotulo}
                >
                  {aluno.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={aluno.foto_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    aluno.classificacao
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-gray-900">{aluno.nome}</p>
                  {aluno.matricula && <p className="text-xs text-gray-400">Matrícula {aluno.matricula}</p>}
                </div>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${CLASSIFICACOES[aluno.classificacao].classe}`}
                >
                  {CLASSIFICACOES[aluno.classificacao].rotulo}
                </span>
              </div>

              {diasAniversario !== null && diasAniversario <= 7 && (
                <p className="rounded-md bg-pink-50 px-3 py-2 text-sm font-medium text-pink-700">
                  {diasAniversario === 0
                    ? '🎂 Aniversário hoje!'
                    : `🎂 Aniversário em ${diasAniversario} dia${diasAniversario === 1 ? '' : 's'}`}
                </p>
              )}

              {aluno.alertas?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {aluno.alertas.map((a) => (
                    <span key={a} className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-800">
                      {a}
                    </span>
                  ))}
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">Idade</dt>
                  <dd className="text-gray-900">{idade !== null ? `${idade} anos` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Último acesso</dt>
                  <dd className="text-gray-900">{dias !== null ? `Há ${dias} dia${dias === 1 ? '' : 's'}` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Telefone</dt>
                  <dd className="text-gray-900">{aluno.telefone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Email</dt>
                  <dd className="truncate text-gray-900">{aluno.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Professor</dt>
                  <dd className="text-gray-900">{aluno.professores?.nome ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Nutricionista</dt>
                  <dd className="text-gray-900">{aluno.nutricionista ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Vencimento do plano</dt>
                  <dd className="text-gray-900">
                    {aluno.vencimento_plano
                      ? new Date(`${aluno.vencimento_plano}T00:00:00`).toLocaleDateString('pt-BR')
                      : '—'}
                    {plano && (
                      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${plano.classe}`}>
                        {plano.rotulo}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Início do plano</dt>
                  <dd className="text-gray-900">
                    {aluno.inicio_plano ? new Date(`${aluno.inicio_plano}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                  </dd>
                </div>
              </dl>

              {aluno.restricoes && (
                <div>
                  <p className="text-xs text-gray-400">Restrições</p>
                  <p className="text-sm text-gray-900">{aluno.restricoes}</p>
                </div>
              )}

              {aluno.observacoes && (
                <div>
                  <p className="text-xs text-gray-400">Observações</p>
                  <p className="text-sm text-gray-900">{aluno.observacoes}</p>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs text-gray-400">Histórico de atendimentos</p>
                {historico.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum atendimento registrado ainda.</p>
                ) : (
                  <div className="space-y-1">
                    {historico.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-sm"
                      >
                        <span className="text-gray-900">
                          {new Date(`${h.data}T00:00:00`).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="truncate text-gray-600">{h.professor_nome}</span>
                        <span className="shrink-0 text-xs text-gray-500">
                          {h.em_andamento ? 'em andamento' : h.duracao_hms}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href={`/alunos/${aluno.id}`}
                className="mt-2 block text-center text-sm text-gray-600 underline hover:text-gray-900"
              >
                Editar cadastro completo
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
