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
  em_sala: boolean
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

export type TipoIntervalo = 'almoco' | 'lanche' | 'janta' | 'outro'

// Intervalo em aberto no painel de sala (bolinha amarela no card do professor).
export interface IntervaloAberto {
  id: string
  professor_id: string
  tipo: TipoIntervalo
  inicio: string
}

// Tarefa (prescrição/laudo/momento coach) lançada pelo líder para o professor.
export interface Tarefa {
  id: string
  aluno_id: string
  professor_id: string
  tipo: TipoTarefa
  data: string
  status: StatusTarefa
  observacao: string | null
  created_at: string
}

export interface TarefaComRelacoes extends Tarefa {
  alunos: Pick<Aluno, 'id' | 'nome'>
  professores: Pick<Professor, 'id' | 'nome'>
}

// Linha de vw_atendimentos (relatório de atendimentos, passo 5).
export interface LinhaAtendimento {
  id: string
  data: string
  inicio: string
  fim: string | null
  em_andamento: boolean
 duracao_min: number
  duracao_hms: string
  entrada_hms: string
  saida_hms: string | null
  aluno_id: string
  aluno_nome: string
  aluno_classificacao: Classificacao
  professor_id: string
  professor_nome: string
  professor_funcao: string | null
}

// Linha de vw_atendimentos_por_professor (produtividade, passo 5).
export interface LinhaAtendimentosPorProfessor {
  data: string
  professor_id: string
  professor_nome: string
  total_atendimentos: number
  minutos_totais: number
  duracao_media_min: number
}

// Linha de vw_tarefas_por_professor_dia (produtividade, passo 5).
export interface LinhaTarefasPorProfessor {
  data: string
  professor_id: string
  professor_nome: string
  total_pendentes: number
  total_concluidas: number
  total_canceladas: number
}

// Linha combinada (atendimentos + tarefas) para a tabela de produtividade.
export interface LinhaProdutividade {
  data: string
  professor_id: string
  professor_nome: string
  total_atendimentos: number
  total_tarefas_concluidas: number
}
