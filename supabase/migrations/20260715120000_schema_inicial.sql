-- Schema inicial do Hope Select: gestão de sala da academia.
-- Substitui o sistema legado "Hostess". Termos de domínio em português.
-- Dados de restrição médica e gravidez são sensíveis (LGPD).

-- Extensão para busca rápida por nome (fluxo: recepcionista digita o nome)
create extension if not exists pg_trgm;

-- ============================================================
-- Tipos enum
-- ============================================================

-- Classificação do aluno por nível de restrição (define a cor no card)
create type classificacao_aluno as enum ('A', 'B', 'C', 'R');
comment on type classificacao_aluno is
  'A=sem restrições (verde), B=leves (amarelo), C=com restrições (vermelho), R=resgate/faltoso (roxo)';

-- Papel do usuário. No MVP só admin/lider/recepcao têm acesso;
-- o papel professor existe para a fase futura (app do professor).
create type papel_usuario as enum ('admin', 'lider', 'recepcao', 'professor');

-- Tipo de tarefa lançada pelo líder para o professor
create type tipo_tarefa as enum ('prescricao', 'laudo', 'momento_coach');

-- Status da tarefa
create type status_tarefa as enum ('pendente', 'concluida', 'cancelada');

-- Gênero do professor (necessário para a regra de negócio "só treina com mulher")
create type genero as enum ('feminino', 'masculino', 'outro');

-- ============================================================
-- Tabelas
-- ============================================================

-- Perfis: vínculo 1:1 com auth.users. Signup público é desativado;
-- apenas o admin cria usuários.
create table perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  papel      papel_usuario not null default 'recepcao',
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- Professores da academia. A foto fica no Storage; guardamos a URL/caminho.
create table professores (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  funcao            text,
  foto_url          text,
  genero            genero not null default 'outro',
  horario_trabalho  text,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Alunos. restricoes/observacoes/alertas podem conter dado sensível (LGPD).
create table alunos (
  id            uuid primary key default gen_random_uuid(),
  matricula     text unique,
  nome          text not null,
  telefone      text,
  classificacao classificacao_aluno not null default 'A',
  restricoes    text,
  observacoes   text,
  alertas       text[] not null default '{}',   -- ex.: {"GRAVIDA","só treina com mulher"}
  ultimo_acesso timestamptz,                     -- base para "Acesso há X dias"
  origem        text,
  created_at    timestamptz not null default now()
);

-- Busca por nome (ilike) e por matrícula
create index idx_alunos_nome_trgm on alunos using gin (nome gin_trgm_ops);
create index idx_alunos_matricula on alunos (matricula);

-- Atendimentos: um aluno com um professor.
-- Duração é CALCULADA nas views, nunca armazenada.
create table atendimentos (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid not null references alunos(id) on delete restrict,
  professor_id   uuid not null references professores(id) on delete restrict,
  inicio         timestamptz not null default now(),
  fim            timestamptz,
  data           date not null default (now() at time zone 'America/Sao_Paulo')::date,
  registrado_por uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint atendimento_fim_apos_inicio check (fim is null or fim >= inicio)
);

create index idx_atendimentos_data on atendimentos (data);
create index idx_atendimentos_professor on atendimentos (professor_id);
create index idx_atendimentos_aluno on atendimentos (aluno_id);
-- Atendimentos em aberto = professor ocupado agora (usado no painel de sala)
create index idx_atendimentos_abertos on atendimentos (professor_id) where fim is null;

-- Tarefas lançadas pelo líder para os professores (normalmente um dia antes).
create table tarefas (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null references alunos(id) on delete cascade,
  professor_id uuid not null references professores(id) on delete cascade,
  tipo         tipo_tarefa not null,
  data         date not null default (now() at time zone 'America/Sao_Paulo')::date,
  status       status_tarefa not null default 'pendente',
  observacao   text,
  created_at   timestamptz not null default now()
);

create index idx_tarefas_professor_data on tarefas (professor_id, data);
create index idx_tarefas_data on tarefas (data);
create index idx_tarefas_status on tarefas (status);

-- Lanches dos professores (hoje anotados à mão pela recepção).
create table lanches (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references professores(id) on delete cascade,
  inicio       timestamptz not null default now(),
  fim          timestamptz,
  data         date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at   timestamptz not null default now(),
  constraint lanche_fim_apos_inicio check (fim is null or fim >= inicio)
);

create index idx_lanches_professor_data on lanches (professor_id, data);
