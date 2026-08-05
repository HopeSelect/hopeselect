-- Substitui "especialistas" (sistema único com tipo) por dois sistemas
-- separados de verdade: Nutri e Fisio, cada um mais simples (lista fixa
-- de quem já está cadastrado, sem busca/adicionar/arrastar — são poucos).

-- Limpa o que foi criado pela migration anterior de especialistas.
drop table if exists atendimentos_especialista;
drop table if exists especialistas;
drop type if exists tipo_especialista;

drop policy if exists "fotos_especialistas_leitura" on storage.objects;
drop policy if exists "fotos_especialistas_insert" on storage.objects;
drop policy if exists "fotos_especialistas_update" on storage.objects;
drop policy if exists "fotos_especialistas_delete" on storage.objects;

-- O bucket "especialistas" em si (e qualquer arquivo dentro dele) precisa
-- ser apagado pela tela do Supabase (Storage), não por SQL — o Supabase
-- bloqueia delete direto nas tabelas internas do storage.

-- ============================================================
-- Nutricionista
-- ============================================================
create table nutricionistas (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  foto_url         text,
  horario_trabalho text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now()
);

create table atendimentos_nutricionista (
  id               uuid primary key default gen_random_uuid(),
  aluno_id         uuid not null references alunos(id) on delete restrict,
  nutricionista_id uuid not null references nutricionistas(id) on delete restrict,
  inicio           timestamptz not null default now(),
  fim              timestamptz,
  data             date not null default (now() at time zone 'America/Sao_Paulo')::date,
  registrado_por   uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint atendimento_nutricionista_fim_apos_inicio check (fim is null or fim >= inicio)
);

create unique index idx_atendimentos_nutricionista_aluno_aberto_unico
on atendimentos_nutricionista (aluno_id)
where fim is null;

create index idx_atendimentos_nutricionista_data on atendimentos_nutricionista (data);
create index idx_atendimentos_nutricionista_nutricionista on atendimentos_nutricionista (nutricionista_id);

alter table nutricionistas enable row level security;
alter table atendimentos_nutricionista enable row level security;

create policy nutricionistas_operacional on nutricionistas for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy atendimentos_nutricionista_operacional on atendimentos_nutricionista for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

grant select, insert, update, delete on nutricionistas, atendimentos_nutricionista to authenticated;
revoke all on nutricionistas, atendimentos_nutricionista from anon;

alter publication supabase_realtime add table public.nutricionistas;
alter publication supabase_realtime add table public.atendimentos_nutricionista;

insert into storage.buckets (id, name, public)
values ('nutricionistas', 'nutricionistas', true)
on conflict (id) do nothing;

create policy "fotos_nutricionistas_leitura"
  on storage.objects for select
  using (bucket_id = 'nutricionistas');

create policy "fotos_nutricionistas_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'nutricionistas' and public.tem_acesso_operacional());

create policy "fotos_nutricionistas_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'nutricionistas' and public.tem_acesso_operacional());

create policy "fotos_nutricionistas_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'nutricionistas' and public.tem_acesso_operacional());

-- ============================================================
-- Fisioterapeuta (tabelas já criadas agora; telas vêm numa próxima leva)
-- ============================================================
create table fisioterapeutas (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  foto_url         text,
  horario_trabalho text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now()
);

create table atendimentos_fisioterapeuta (
  id                uuid primary key default gen_random_uuid(),
  aluno_id          uuid not null references alunos(id) on delete restrict,
  fisioterapeuta_id uuid not null references fisioterapeutas(id) on delete restrict,
  inicio            timestamptz not null default now(),
  fim               timestamptz,
  data              date not null default (now() at time zone 'America/Sao_Paulo')::date,
  registrado_por    uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint atendimento_fisioterapeuta_fim_apos_inicio check (fim is null or fim >= inicio)
);

create unique index idx_atendimentos_fisioterapeuta_aluno_aberto_unico
on atendimentos_fisioterapeuta (aluno_id)
where fim is null;

create index idx_atendimentos_fisioterapeuta_data on atendimentos_fisioterapeuta (data);
create index idx_atendimentos_fisioterapeuta_fisioterapeuta on atendimentos_fisioterapeuta (fisioterapeuta_id);

alter table fisioterapeutas enable row level security;
alter table atendimentos_fisioterapeuta enable row level security;

create policy fisioterapeutas_operacional on fisioterapeutas for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy atendimentos_fisioterapeuta_operacional on atendimentos_fisioterapeuta for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

grant select, insert, update, delete on fisioterapeutas, atendimentos_fisioterapeuta to authenticated;
revoke all on fisioterapeutas, atendimentos_fisioterapeuta from anon;

alter publication supabase_realtime add table public.fisioterapeutas;
alter publication supabase_realtime add table public.atendimentos_fisioterapeuta;

insert into storage.buckets (id, name, public)
values ('fisioterapeutas', 'fisioterapeutas', true)
on conflict (id) do nothing;

create policy "fotos_fisioterapeutas_leitura"
  on storage.objects for select
  using (bucket_id = 'fisioterapeutas');

create policy "fotos_fisioterapeutas_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fisioterapeutas' and public.tem_acesso_operacional());

create policy "fotos_fisioterapeutas_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'fisioterapeutas' and public.tem_acesso_operacional());

create policy "fotos_fisioterapeutas_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'fisioterapeutas' and public.tem_acesso_operacional());
