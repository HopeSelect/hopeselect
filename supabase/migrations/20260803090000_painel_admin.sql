-- Painel ADM: gestão de usuários (lista com email + trocar papel/ativo) e
-- verificação de saúde dos dados (nomes de aluno parecidos, atendimentos
-- abertos há muito tempo, tarefas atrasadas).

-- Lista os perfis com o email (de auth.users) — precisa de SECURITY DEFINER
-- porque authenticated não tem select direto em auth.users. Só funciona
-- pra quem já é admin (checagem feita dentro da função).
create or replace function public.admin_listar_perfis()
returns table (
  id uuid,
  nome text,
  papel papel_usuario,
  ativo boolean,
  created_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;

  return query
    select p.id, p.nome, p.papel, p.ativo, p.created_at, u.email::text
    from perfis p
    join auth.users u on u.id = p.id
    order by p.nome;
end;
$$;

grant execute on function public.admin_listar_perfis() to authenticated;

-- Alunos com nome parecido (possível duplicado com erro de digitação).
-- Usa pg_trgm, já instalada desde o schema inicial.
create view vw_admin_alunos_parecidos with (security_invoker = on) as
select
  a.id as id_a,
  a.nome as nome_a,
  b.id as id_b,
  b.nome as nome_b,
  round(similarity(a.nome, b.nome)::numeric, 2) as parecido
from alunos a
join alunos b on a.id < b.id
where similarity(a.nome, b.nome) > 0.5
order by parecido desc;

-- Atendimentos abertos há mais de 4h — sinal de esquecimento de finalizar.
create view vw_admin_atendimentos_longos with (security_invoker = on) as
select
  a.id,
  a.inicio,
  al.nome as aluno_nome,
  p.nome as professor_nome,
  round(extract(epoch from (now() - a.inicio)) / 3600.0, 1) as horas_aberto
from atendimentos a
join alunos al on al.id = a.aluno_id
join professores p on p.id = a.professor_id
where a.fim is null and a.inicio < now() - interval '4 hours'
order by a.inicio;

-- Tarefas cuja data já passou e ainda não foram concluídas nem canceladas.
create view vw_admin_tarefas_atrasadas with (security_invoker = on) as
select
  t.id,
  t.data,
  t.tipo,
  t.status,
  al.nome as aluno_nome,
  p.nome as professor_nome
from tarefas t
join alunos al on al.id = t.aluno_id
join professores p on p.id = t.professor_id
where t.data < current_date and t.status not in ('concluida', 'cancelada')
order by t.data;

grant select on vw_admin_alunos_parecidos, vw_admin_atendimentos_longos, vw_admin_tarefas_atrasadas to authenticated;
revoke all on vw_admin_alunos_parecidos, vw_admin_atendimentos_longos, vw_admin_tarefas_atrasadas from anon;
