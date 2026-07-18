// Tipos do domínio (espelham os enums e tabelas das migrations).

export type Classificacao = 'A' | 'B' | 'C' | 'R'
export type Papel = 'admin' | 'lider' | 'recepcao' | 'professor'
export type Genero = 'feminino' | 'masculino' | 'outro'
export type TipoTarefa = 'prescricao' | 'laudo' | 'momento_coach' | 'lanche'
export type StatusTarefa = 'a_realizar' | 'concluida' | 'cancelada' | 'agendar' | 'realizar_novamente'

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

export type AlunoResumo = Pick<Aluno, 'id' | 'nome' | 'classificacao' | 'alertas' | 'ultimo_acesso' | 'restricoes'>

export interface AtendimentoAberto {
  id: string
  aluno_id: string
  professor_id: string
  inicio: string
  tarefa: TipoTarefa | null
  alunos: AlunoResumo
}

export type TipoIntervalo = 'almoco' | 'lanche' | 'janta' | 'outro'

export interface IntervaloAberto {
  id: string
  professor_id: string
  tipo: TipoIntervalo
  inicio: string
}

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
  alunos: Pick<Aluno, 'id' | 'nome' | 'matricula'>
  professores: Pick<Professor, 'id' | 'nome'>
}

// Linha de vw_tarefas_detalhe (relatório de Tarefas: filtros, exportação, gráficos).
export interface LinhaTarefa {
  id: string
  data: string
  tipo: TipoTarefa
  status: StatusTarefa
  observacao: string | null
  aluno_id: string
  aluno_matricula: string | null
  aluno_nome: string
  professor_id: string
  professor_nome: string
  created_at: string
}

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
  tarefa: TipoTarefa | null
  aluno_id: string
  aluno_nome: string
  aluno_classificacao: Classificacao
  professor_id: string
  professor_nome: string
  professor_funcao: string | null
}

export interface LinhaAtendimentosPorProfessor {
  data: string
  professor_id: string
  professor_nome: string
  total_atendimentos: number
  minutos_totais: number
  duracao_media_min: number
}

export interface LinhaTarefasPorProfessor {
  data: string
  professor_id: string
  professor_nome: string
  total_pendentes: number
  total_concluidas: number
  total_canceladas: number
}

export interface LinhaProdutividade {
  data: string
  professor_id: string
  professor_nome: string
  total_atendimentos: number
  total_tarefas_concluidas: number
}
