'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Aluno, Classificacao } from '@/lib/tipos'
import { CLASSIFICACOES, idadeDesde } from '@/lib/utils'
import type { EstadoForm } from './actions'

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>

type OpcaoNome = { id: string; nome: string }

const campo =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

export function AlunoForm({
  acao,
  professores,
  inicial,
}: {
  acao: Acao
  professores: OpcaoNome[]
  inicial?: Aluno
}) {
  const [estado, submit, pendente] = useActionState(acao, null)
  const idade = idadeDesde(inicial?.data_nascimento ?? null)

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Nome completo *
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
          Email
          <input name="email" type="email" defaultValue={inicial?.email ?? ''} className={campo} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-gray-700">
          Data de nascimento
          {idade !== null && <span className="ml-1 font-normal text-gray-400">({idade} anos)</span>}
          <input
            name="data_nascimento"
            type="date"
            defaultValue={inicial?.data_nascimento?.slice(0, 10) ?? ''}
            className={campo}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Classificação
          <select name="classificacao" defaultValue={inicial?.classificacao ?? 'A'} className={campo}>
            {(Object.keys(CLASSIFICACOES) as Classificacao[]).map((c) => (
              <option key={c} value={c}>
                {CLASSIFICACOES[c].rotulo}
              </option>
            ))}
          </select>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-gray-700">
          Data da matrícula
          <input
            name="data_matricula"
            type="date"
            defaultValue={inicial?.data_matricula?.slice(0, 10) ?? ''}
            className={campo}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Início do plano
          <input
            name="inicio_plano"
            type="date"
            defaultValue={inicial?.inicio_plano?.slice(0, 10) ?? ''}
            className={campo}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Vencimento do plano
          <input
            name="vencimento_plano"
            type="date"
            defaultValue={inicial?.vencimento_plano?.slice(0, 10) ?? ''}
            className={campo}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Professor
          <select name="professor_id" defaultValue={inicial?.professor_id ?? ''} className={campo}>
            <option value="">Nenhum</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Nutricionista
          <input name="nutricionista" defaultValue={inicial?.nutricionista ?? ''} className={campo} />
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Restrições
        <textarea name="restricoes" rows={2} defaultValue={inicial?.restricoes ?? ''} className={campo} />
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
        <textarea name="observacoes" rows={2} defaultValue={inicial?.observacoes ?? ''} className={campo} />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Origem
        <input name="origem" defaultValue={inicial?.origem ?? ''} className={campo} />
      </label>

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
