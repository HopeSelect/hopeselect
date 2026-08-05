-- Nutricionista/Fisioterapeuta como sistema separado de verdade — não
-- reaproveita a tabela de professores. Mesma estrutura básica (cadastro +
-- atendimento), mas trilhos próprios: Sala e relatório vêm nas próximas fases.
--
-- NOTA HISTÓRICA: esse desenho (uma tabela "especialistas" com um campo de
-- tipo) foi substituído pela migration 20260804140000_reformula_nutri_fisio,
-- que separa Nutri e Fisio em tabelas de verdade. Esse arquivo fica aqui só
-- pra manter a sequência real do que foi aplicado no banco.

create type tipo_especialista as enum ('nutricionista', 'fisioterapeuta');

create table especialistas (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  tipo             tipo_especialista not null,
  foto_url         text,
  horario_trabalho text,
  ativo            boolean not null default true,
  em_sala          boolean not null default false,
  pos_x            integer,
  pos_y            integer,
  created_at       timestamptz not null default now()
);

create table atendimentos_especialista (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references alunos(id) on delete restrict,
  especialista_id uuid not null references especialistas(id) on delete restrict,
  inicio          timestamptz not null default now(),
  fim             timestamptz,
  data            date not null default (now() at time zone 'America/Sao_Paulo')::date,
  registrado_por  uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint atendimento_especialista_fim_apos_inicio check (fim is null or fim >= inicio)
);

create index idx_atendimentos_especialista_data on atendimentos_especialista (data);
create index idx_atendimentos_especialista_especialista on atendimentos_especialista (especialista_id);
create index idx_atendimentos_especialista_aluno on atendimentos_especialista (aluno_id);
create index idx_atendimentos_especialista_abertos on atendimentos_especialista (especialista_id) where fim is null;

alter table especialistas enable row level security;
alter table atendimentos_especialista enable row level security;

create policy especialistas_operacional on especialistas for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy atendimentos_especialista_operacional on atendimentos_especialista for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

grant select, insert, update, delete on especialistas, atendimentos_especialista to authenticated;
revoke all on especialistas, atendimentos_especialista from anon;

alter publication supabase_realtime add table public.especialistas;
alter publication supabase_realtime add table public.atendimentos_especialista;

-- Bucket de foto, mesmo padrão de professores/alunos.
insert into storage.buckets (id, name, public)
values ('especialistas', 'especialistas', true)
on conflict (id) do nothing;

create policy "fotos_especialistas_leitura"
  on storage.objects for select
  using (bucket_id = 'especialistas');

create policy "fotos_especialistas_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'especialistas' and public.tem_acesso_operacional());

create policy "fotos_especialistas_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'especialistas' and public.tem_acesso_operacional());

create policy "fotos_especialistas_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'especialistas' and public.tem_acesso_operacional());
