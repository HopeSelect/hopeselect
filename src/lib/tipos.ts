// Tipos do domínio (espelham os enums e tabelas das migrations).

export type Classificacao = 'A' | 'B' | 'C' | 'R'
export type Papel = 'admin' | 'lider' | 'recepcao' | 'professor'
export type Genero = 'feminino' | 'masculino' | 'outro'
export type TipoTarefa = 'prescricao' | 'laudo' | 'momento_coach'
export type StatusTarefa = 'pendente' | 'concluida' | 'cancelada'

export interface Professor {
  id: string
  nome: string
  funcao: string | null
  foto_url: string | null
  genero: Genero
  horario_trabalho: string | null
  ativo: boolean
  pos_x: number | null
  pos_y: number | null
  created_at: string
}

export interface Aluno {
  id: string
  matricula: string | null
  nome: string
  telefone: string | null
  classificacao: Classificacao
  restricoes: string | null
  observacoes: string | null
  alertas: string[]
  ultimo_acesso: string | null
  origem: string | null
  created_at: string
}

// Aluno em busca/alocação: só os campos que a recepção precisa ler de relance.
export type AlunoResumo = Pick<
  Aluno,
  'id' | 'nome' | 'classificacao' | 'alertas' | 'ultimo_acesso'
>

// Atendimento em aberto no painel de sala, já com o aluno embutido
// (select aninhado via FK aluno_id -> alunos).
export interface AtendimentoAberto {
  id: string
  aluno_id: string
  professor_id: string
  inicio: string
  alunos: AlunoResumo
}

