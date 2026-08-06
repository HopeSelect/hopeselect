-- Permite a líder preencher manualmente a última vez que o aluno teve
-- momento coach / prescrição / laudo / atendimento com a nutricionista —
-- útil pra registrar histórico anterior ao sistema rastrear isso sozinho.
-- As views abaixo combinam o valor manual com o calculado automaticamente
-- (tarefas concluídas / atendimentos_nutricionista), sempre usando o mais
-- recente dos dois — sem precisar mudar nenhuma tela que já lê essas views.

alter table alunos add column ultimo_momento_coach date;
alter table alunos add column ultima_prescricao date;
alter table alunos add column ultimo_laudo date;
alter table alunos add column ultimo_atendimento_nutri date;

create or replace view vw_alertas_aluno_status with (security_invoker = on) as
with automaticas as (
  select aluno_id, 'prescricao'::text as tipo, max(data) as ultima_data
  from tarefas
  where tipo = 'prescricao' and status = 'concluida'
  group by aluno_id
  union all
  select aluno_id, 'laudo'::text as tipo, max(data) as ultima_data
  from tarefas
  where tipo = 'laudo' and status = 'concluida'
  group by aluno_id
  union all
  select aluno_id, 'nutri'::text as tipo, max(data) as ultima_data
  from atendimentos_nutricionista
  group by aluno_id
),
manuais as (
  select id as aluno_id, 'prescricao'::text as tipo, ultima_prescricao as ultima_data
  from alunos where ultima_prescricao is not null
  union all
  select id as aluno_id, 'laudo'::text as tipo, ultimo_laudo as ultima_data
  from alunos where ultimo_laudo is not null
  union all
  select id as aluno_id, 'nutri'::text as tipo, ultimo_atendimento_nutri as ultima_data
  from alunos where ultimo_atendimento_nutri is not null
),
maiores as (
  select aluno_id, tipo, max(ultima_data) as ultima_data
  from (select * from automaticas union all select * from manuais) combinadas
  group by aluno_id, tipo
)
select
  al.id as aluno_id,
  al.nome as aluno_nome,
  al.matricula as aluno_matricula,
  t.tipo,
  m.ultima_data,
  case when m.ultima_data is null then null else (m.ultima_data + interval '60 days')::date end as proxima_data
from alunos al
cross join (select unnest(array['prescricao', 'laudo', 'nutri']) as tipo) t
left join maiores m on m.aluno_id = al.id and m.tipo = t.tipo;

grant select on vw_alertas_aluno_status to authenticated;
revoke all on vw_alertas_aluno_status from anon;

create or replace view vw_ultimo_momento_coach with (security_invoker = on) as
select
  al.id as aluno_id,
  greatest(tc.ultima_data, al.ultimo_momento_coach) as ultima_data
from alunos al
left join (
  select aluno_id, max(data) as ultima_data
  from tarefas
  where tipo = 'momento_coach' and status = 'concluida'
  group by aluno_id
) tc on tc.aluno_id = al.id
where tc.ultima_data is not null or al.ultimo_momento_coach is not null;

grant select on vw_ultimo_momento_coach to authenticated;
revoke all on vw_ultimo_momento_coach from anon;
