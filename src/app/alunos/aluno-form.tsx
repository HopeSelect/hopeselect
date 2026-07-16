'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Aluno, Classificacao } from '@/lib/tipos'
import { CLASSIFICACOES } from '@/lib/utils'
import type { EstadoForm } from './actions'

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>

const campo =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

export function AlunoForm({ acao, inicial }: { acao: Acao; inicial?: Aluno }) {
  const [estado, submit, pendente] = useActionState(acao, null)

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Nome *
        <input name="nome" required defaultValue={inicial?.nome} className={campo} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-gray-700">
          Matrícula
          <input name="matricula" defaultValue={inicial?.matricula ?? ''} className={campo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Telefone
          <input name="telefone" defaultValue={inicial?.telefone ?? ''} className={campo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Classificação
          <select
            name="classificacao"
            defaultValue={inicial?.classificacao ?? 'A'}
            className={campo}
          >
            {(Object.keys(CLASSIFICACOES) as Classificacao[]).map((c) => (
              <option key={c} value={c}>
                {CLASSIFICACOES[c].rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Restrições
        <textarea
          name="restricoes"
          rows={2}
          defaultValue={inicial?.restricoes ?? ''}
          className={campo}
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Alertas (separe por vírgula)
        <input
          name="alertas"
          defaultValue={inicial?.alertas?.join(', ') ?? ''}
          placeholder="GRAVIDA, só treina com mulher"
          className={campo}
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Observações
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={inicial?.observacoes ?? ''}
          className={campo}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Origem
          <input name="origem" defaultValue={inicial?.origem ?? ''} className={campo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Último acesso
          <input
            name="ultimo_acesso"
            type="date"
            defaultValue={inicial?.ultimo_acesso?.slice(0, 10) ?? ''}
            className={campo}
          />
        </label>
      </div>

      {estado?.erro && (
        <p className="text-sm text-red-600" role="alert">
          {estado.erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {pendente ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/alunos" className="text-sm text-gray-500 hover:text-gray-900">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
