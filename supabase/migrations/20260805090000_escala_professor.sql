-- Escala de trabalho estruturada do professor — substitui, pra fins de
-- cálculo, o texto livre "horario_trabalho" (que continua existindo só
-- como resumo visual). Cada linha é um bloco: professor + dia da semana +
-- início + fim. Um professor que trabalha manhã e noite numa segunda tem
-- 2 linhas pra segunda-feira — não dá pra assumir um horário fixo único
-- por dia, já que "depende muito" (tem professor de dia e de noite).

create table professor_horarios (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references professores(id) on delete cascade,
  dia_semana   smallint not null check (dia_semana between 0 and 6), -- 0=domingo .. 6=sábado
  hora_inicio  time not null,
  hora_fim     time not null,
  created_at   timestamptz not null default now(),
  constraint professor_horario_fim_apos_inicio check (hora_fim > hora_inicio)
);

create index idx_professor_horarios_professor on professor_horarios (professor_id);
create index idx_professor_horarios_dia on professor_horarios (dia_semana, hora_inicio, hora_fim);

alter table professor_horarios enable row level security;

create policy professor_horarios_operacional on professor_horarios for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

grant select, insert, update, delete on professor_horarios to authenticated;
revoke all on professor_horarios from anon;

alter publication supabase_realtime add table public.professor_horarios;
