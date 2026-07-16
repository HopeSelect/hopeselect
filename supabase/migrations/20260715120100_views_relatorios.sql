-- Views de relatório. Toda agregação vive aqui (no banco), nunca no front.
-- Duração é sempre calculada: coalesce(fim, now()) - inicio.
--
-- security_invoker = on: a view roda com as permissões de quem consulta,
-- então o RLS das tabelas-base é respeitado (nada de vazar dados via view).

-- Detalhe de cada atendimento, já com aluno/professor e duração em minutos.
create view vw_atendimentos with (security_invoker = on) as
select
  a.id,
  a.data,
  a.inicio,
  a.fim,
  (a.fim is null)                                                         as em_andamento,
  round(extract(epoch from (coalesce(a.fim, now()) - a.inicio)) / 60.0, 1) as duracao_min,
  a.aluno_id,
  al.nome          as aluno_nome,
  al.classificacao as aluno_classificacao,
  a.professor_id,
  p.nome           as professor_nome,
  p.funcao         as professor_funcao
from atendimentos a
join alunos al      on al.id = a.aluno_id
join professores p  on p.id  = a.professor_id;

-- Consolidado por dia (para dashboards e exportação Excel).
create view vw_atendimentos_por_dia with (security_invoker = on) as
select
  data,
  count(*)                                                                     as total_atendimentos,
  count(*) filter (where fim is not null)                                      as finalizados,
  round(sum(extract(epoch from (coalesce(fim, now()) - inicio)) / 60.0), 1)    as minutos_totais,
  round(avg(extract(epoch from (coalesce(fim, now()) - inicio)) / 60.0), 1)    as duracao_media_min
from atendimentos
group by data;

-- Consolidado por professor por dia.
create view vw_atendimentos_por_professor with (security_invoker = on) as
select
  a.data,
  a.professor_id,
  p.nome                                                                         as professor_nome,
  count(*)                                                                       as total_atendimentos,
  round(sum(extract(epoch from (coalesce(a.fim, now()) - a.inicio)) / 60.0), 1)  as minutos_totais,
  round(avg(extract(epoch from (coalesce(a.fim, now()) - a.inicio)) / 60.0), 1)  as duracao_media_min
from atendimentos a
join professores p on p.id = a.professor_id
group by a.data, a.professor_id, p.nome;

-- Tarefas pendentes por professor por dia (planejamento da recepção).
create view vw_tarefas_pendentes with (security_invoker = on) as
select
  t.data,
  t.professor_id,
  p.nome                                    as professor_nome,
  t.tipo,
  count(*)                                  as total
from tarefas t
join professores p on p.id = t.professor_id
where t.status = 'pendente'
group by t.data, t.professor_id, p.nome, t.tipo;

-- As views só podem ser lidas por usuários autenticados.
grant select on vw_atendimentos, vw_atendimentos_por_dia,
                vw_atendimentos_por_professor, vw_tarefas_pendentes
  to authenticated;
revoke all on vw_atendimentos, vw_atendimentos_por_dia,
              vw_atendimentos_por_professor, vw_tarefas_pendentes
  from anon;
