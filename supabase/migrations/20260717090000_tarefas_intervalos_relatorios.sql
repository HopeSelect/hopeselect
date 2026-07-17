-- Ajustes para: tarefas dos professores (passo 4), bolinha amarela de
-- intervalo no painel de sala, e relatório de produtividade (passo 5).
-- Não recria nada que já existe em 20260715120000/20260715120100.

-- ============================================================
-- Tipo de intervalo do professor (almoço/lanche/janta/outro).
-- A tabela `lanches` já existe; só falta o tipo.
-- ============================================================
create type tipo_intervalo as enum ('almoco', 'lanche', 'janta', 'outro');

alter table lanches
  add column tipo tipo_intervalo not null default 'lanche';

comment on column lanches.tipo is
  'Tipo de intervalo do professor: almoço, lanche, janta ou outro.';

-- Intervalo em aberto = professor fora da sala agora (bolinha amarela).
create index idx_lanches_abertos on lanches (professor_id) where fim is null;

-- ============================================================
-- Realtime para lanches (professores e atendimentos já estão
-- na publication desde a migration do painel de sala).
-- ============================================================
alter publication supabase_realtime add table public.lanches;

-- ============================================================
-- View de tarefas por professor/dia (pendentes, concluídas, canceladas).
-- Complementa vw_tarefas_pendentes (que já existe e só cobre pendentes)
-- para alimentar o relatório de produtividade do passo 5.
-- ============================================================
create view vw_tarefas_por_professor_dia with (security_invoker = on) as
select
  t.data,
  t.professor_id,
  p.nome as professor_nome,
  count(*) filter (where t.status = 'pendente')  as total_pendentes,
  count(*) filter (where t.status = 'concluida') as total_concluidas,
  count(*) filter (where t.status = 'cancelada') as total_canceladas
from tarefas t
join professores p on p.id = t.professor_id
group by t.data, t.professor_id, p.nome;

grant select on vw_tarefas_por_professor_dia to authenticated;
revoke all on vw_tarefas_por_professor_dia from anon;
