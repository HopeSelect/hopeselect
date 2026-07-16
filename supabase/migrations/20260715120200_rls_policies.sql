-- Políticas RLS. A segurança vive no banco, não no front.
-- MVP: acesso operacional é liberado para admin/lider/recepcao (todos veem a sala).
-- O papel professor NÃO tem acesso nesta fase (app do professor é futuro).
-- A granularidade "professor vê só a própria fila" entra quando esse app existir.

-- ============================================================
-- Funções auxiliares (SECURITY DEFINER para consultar perfis
-- sem recursão de RLS na própria tabela perfis).
-- ============================================================

create or replace function public.perfil_papel()
returns papel_usuario
language sql stable security definer set search_path = public
as $$
  select papel from public.perfis where id = auth.uid() and ativo;
$$;

create or replace function public.tem_acesso_operacional()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid()
      and ativo
      and papel in ('admin', 'lider', 'recepcao')
  );
$$;

create or replace function public.eh_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and ativo and papel = 'admin'
  );
$$;

-- ============================================================
-- perfis: cada um lê o próprio; só admin cria/edita/remove.
-- ============================================================
alter table perfis enable row level security;

create policy perfis_select on perfis for select to authenticated
  using (id = auth.uid() or eh_admin());

create policy perfis_insert on perfis for insert to authenticated
  with check (eh_admin());

create policy perfis_update on perfis for update to authenticated
  using (eh_admin()) with check (eh_admin());

create policy perfis_delete on perfis for delete to authenticated
  using (eh_admin());

-- ============================================================
-- Tabelas operacionais: acesso total para a equipe (admin/lider/recepcao).
-- ============================================================
alter table alunos       enable row level security;
alter table professores  enable row level security;
alter table atendimentos enable row level security;
alter table tarefas      enable row level security;
alter table lanches      enable row level security;

create policy alunos_operacional on alunos for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy professores_operacional on professores for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy atendimentos_operacional on atendimentos for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy tarefas_operacional on tarefas for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy lanches_operacional on lanches for all to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

-- ============================================================
-- Privilégios. RLS filtra as linhas; os grants abaixo garantem
-- que o papel anônimo não toque em dado de aluno (defesa em profundidade, LGPD).
-- ============================================================
grant select, insert, update, delete
  on alunos, professores, atendimentos, tarefas, lanches, perfis
  to authenticated;

revoke all
  on alunos, professores, atendimentos, tarefas, lanches, perfis
  from anon;
