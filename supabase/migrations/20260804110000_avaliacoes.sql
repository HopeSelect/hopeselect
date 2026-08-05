-- Módulo de Avaliações: registro periódico de reavaliação do aluno
-- (coach, nutricional, funcional), com alerta automático de vencimento.
-- Prazos pedidos pelo cliente: coach e nutricional a cada 3 meses,
-- funcional a cada 6 meses.

create type tipo_avaliacao as enum ('coach', 'nutricional', 'funcional');

create table avaliacoes (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid not null references alunos(id) on delete cascade,
  tipo           tipo_avaliacao not null,
  data_realizada date not null default (now() at time zone 'America/Sao_Paulo')::date,
  observacao     text,
  registrado_por uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index idx_avaliacoes_aluno_tipo on avaliacoes (aluno_id, tipo, data_realizada desc);

alter table avaliacoes enable row level security;

create policy avaliacoes_operacional on avaliacoes for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

grant select, insert, update, delete on avaliacoes to authenticated;
revoke all on avaliacoes from anon;

alter publication supabase_realtime add table public.avaliacoes;

-- Situação de cada aluno em cada tipo de avaliação: última data feita e
-- quando vence a próxima, já calculada pelo prazo de cada tipo.
create view vw_avaliacoes_status with (security_invoker = on) as
with ultimas as (
  select distinct on (aluno_id, tipo)
    aluno_id, tipo, data_realizada
  from avaliacoes
  order by aluno_id, tipo, data_realizada desc
)
select
  al.id as aluno_id,
  al.nome as aluno_nome,
  al.matricula as aluno_matricula,
  t.tipo,
  u.data_realizada as ultima_avaliacao,
  case
    when u.data_realizada is null then null
    when t.tipo = 'funcional' then (u.data_realizada + interval '6 months')::date
    else (u.data_realizada + interval '3 months')::date
  end as proxima_data
from alunos al
cross join (select unnest(enum_range(null::tipo_avaliacao)) as tipo) t
left join ultimas u on u.aluno_id = al.id and u.tipo = t.tipo;

grant select on vw_avaliacoes_status to authenticated;
revoke all on vw_avaliacoes_status from anon;
