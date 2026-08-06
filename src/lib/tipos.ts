// Tipos do domínio (espelham os enums e tabelas das migrations).
export type Classificacao = 'A' | 'B' | 'C' | 'R'
export type Papel = 'admin' | 'lider' | 'recepcao' | 'professor'
export type Genero = 'feminino' | 'masculino' | 'outro'
export type TipoTarefa = 'prescricao' | 'laudo' | 'momento_coach' | 'lanche'
export type StatusTarefa = 'a_realizar' | 'concluida' | 'cancelada' | 'agendar' | 'realizar_novamente'
export type TipoAvaliacao = 'coach' | 'nutricional' | 'funcional'
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
// Nutri e Fisio são sistemas separados de verdade (não compartilham tabela
// nem tela) — cada um mais simples que Professor: sem "em_sala"/posição,
// porque a lista mostra direto todo mundo cadastrado (são poucos).
export interface Nutricionista {
  id: string
  nome: string
  foto_url: string | null
  horario_trabalho: string | null
  ativo: boolean
  created_at: string
}
export interface Fisioterapeuta {
  id: string
  nome: string
  foto_url: string | null
  horario_trabalho: string | null
  ativo: boolean
  created_at: string
}
// Bloco de escala do professor (dia da semana + faixa de horário). Um
// professor pode ter vários blocos no mesmo dia (ex: manhã e noite).
export interface HorarioProfessor {
  id: string
  professor_id: string
  dia_semana: number // 0=domingo .. 6=sábado
  hora_inicio: string // formato "HH:MM:SS" (tipo time do Postgres)
  hora_fim: string
}
export interface Aluno {
  id: string
  matricula: string | null
  nome: string
  telefone: string | null
  email: string | null
  data_nascimento: string | null
  data_matricula: string | null
  inicio_plano: string | null
  vencimento_plano: string | null
  classificacao: Classificacao
  restricoes: string | null
  observacoes: string | null
  alertas: string[]
  ultimo_acesso: string | null
  origem: string | null
  professor_id: string | null
  nutricionista: string | null
  foto_url: string | null
  created_at: string
}
// Aluno com o nome do professor vinculado embutido (join usado na listagem).
export interface AlunoComProfessor extends Aluno {
  professores: Pick<Professor, 'nome'> | null
}
export type AlunoResumo = Pick<Aluno, 'id' | 'nome' | 'classificacao' | 'alertas' | 'ultimo_acesso' | 'restricoes' | 'foto_url'>
export interface AtendimentoAberto {
  id: string
  aluno_id: string
  professor_id: string
  inicio: string
  tarefa: TipoTarefa | null
  alunos: AlunoResumo
}
export interface AtendimentoNutriAberto {
  id: string
  aluno_id: string
  nutricionista_id: string
  inicio: string
  alunos: AlunoResumo
}
export interface AtendimentoFisioAberto {
  id: string
  aluno_id: string
  fisioterapeuta_id: string
  inicio: string
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
  inicio: string | null
  fim: string | null
  created_at: string
}
export interface TarefaComRelacoes extends Tarefa {
  alunos: Pick<Aluno, 'id' | 'nome' | 'matricula'>
  professores: Pick<Professor, 'id' | 'nome'>
}
// Tarefa do dia mostrada no card do professor na Sala (join enxuto).
export interface TarefaDoDia {
  id: string
  aluno_id: string
  professor_id: string
  tipo: TipoTarefa
  status: StatusTarefa
  observacao: string | null
  inicio: string | null
  fim: string | null
  alunos: Pick<Aluno, 'id' | 'nome'>
}
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
// Linha de ocupação por professor: horas escaladas (da escala semanal) x
// horas trabalhadas (atendimentos + tarefas com cronômetro), no período
// filtrado. percentual é null quando o professor não tem escala cadastrada
// ainda (não dá pra calcular % sem saber quanto ele deveria trabalhar).
export interface LinhaOcupacaoProfessor {
  professor_id: string
  professor_nome: string
  horas_escaladas: number
  horas_trabalhadas: number
  percentual: number | null
}
// Linha de vw_avaliacoes_status (uma linha por aluno + tipo de avaliação).
export interface LinhaAvaliacaoStatus {
  aluno_id: string
  aluno_nome: string
  aluno_matricula: string | null
  tipo: TipoAvaliacao
  ultima_avaliacao: string | null
  proxima_data: string | null
}
