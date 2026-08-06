-- 1) Repara "último acesso" de alunos que já vieram, mas nunca tiveram o
-- campo atualizado (a automação só passou a existir agora, nas actions de
-- alocar aluno em professor/nutri/fisio). Sem isso, o histórico anterior
-- continuaria mostrando dado desatualizado mesmo depois do conserto.
update alunos al
set ultimo_acesso = maiores.ultima_data
from (
  select aluno_id, max(data) as ultima_data
  from (
    select aluno_id, data from atendimentos
    union all
    select aluno_id, data from atendimentos_nutricionista
    union all
    select aluno_id, data from atendimentos_fisioterapeuta
  ) todos
  group by aluno_id
) maiores
where al.id = maiores.aluno_id
  and (al.ultimo_acesso is null or al.ultimo_acesso < maiores.ultima_data);

-- 2) Alerta de 60 em 60 dias pra prescrição de treino, laudo e atendimento
-- com a nutricionista. Não inclui momento coach (não pedido) nem a
-- "avaliação nutricional" do módulo Avaliações (essa é outra coisa,
-- com prazo de 3 meses, já resolvida em outra migration).
create view vw_alertas_aluno_status with (security_invoker = on) as
with ultimas as (
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
)
select
  al.id as aluno_id,
  al.nome as aluno_nome,
  al.matricula as aluno_matricula,
  t.tipo,
  u.ultima_data,
  case when u.ultima_data is null then null else (u.ultima_data + interval '60 days')::date end as proxima_data
from alunos al
cross join (select unnest(array['prescricao', 'laudo', 'nutri']) as tipo) t
left join ultimas u on u.aluno_id = al.id and u.tipo = t.tipo;

grant select on vw_alertas_aluno_status to authenticated;
revoke all on vw_alertas_aluno_status from anon;

-- 3) Momento coach não entra no alerta de 60 dias, mas o cliente pediu pra
-- mostrar "quando foi a última vez" na ficha do aluno mesmo assim — essa
-- view dá isso pronto, sem precisar buscar aluno por aluno na tela.
create view vw_ultimo_momento_coach with (security_invoker = on) as
select aluno_id, max(data) as ultima_data
from tarefas
where tipo = 'momento_coach' and status = 'concluida'
group by aluno_id;

grant select on vw_ultimo_momento_coach to authenticated;
revoke all on vw_ultimo_momento_coach from anon;
