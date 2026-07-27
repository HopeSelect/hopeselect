'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { CLASSIFICACOES, diasDesde, idadeDesde, statusPlano } from '@/lib/utils'
import type { AlunoComProfessor } from '@/lib/tipos'

export function PerfilAlunoModal({ alunoId, onFechar }: { alunoId: string; onFechar: () => void }) {
  const supabase = criarClienteBrowser()
  const [aluno, setAluno] = useState<AlunoComProfessor | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    supabase
      .from('alunos')
      .select('*, professores(nome)')
      .eq('id', alunoId)
      .single()
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) setErro(error.message)
        setAluno((data as unknown as AlunoComProfessor) ?? null)
        setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [alunoId, supabase])

  const dias = aluno ? diasDesde(aluno.ultimo_acesso) : null
  const idade = aluno ? idadeDesde(aluno.data_nascimento) : null
  const plano = aluno ? statusPlano(aluno.vencimento_plano) : null

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
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-gray-900">{aluno.nome}</p>
                  {aluno.matricula && <p className="text-xs text-gray-400">Matrícula {aluno.matricula}</p>}
                </div>
                <span
                  className={`rounded border px-2 py-0.5 text-xs font-medium ${CLASSIFICACOES[aluno.classificacao].classe}`}
                >
                  {CLASSIFICACOES[aluno.classificacao].rotulo}
                </span>
              </div>

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
