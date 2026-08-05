-- Restringe criar/excluir tarefas a líder e admin (a recepção continua
-- podendo ver e atualizar status/cronômetro pelas ações da Sala — iniciar/
-- concluir tarefa —, só não pode criar/lançar nem apagar).

create or replace function public.tem_acesso_lideranca()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and ativo and papel in ('admin', 'lider')
  );
$$;

drop policy if exists tarefas_operacional on tarefas;

create policy tarefas_select on tarefas for select to authenticated
  using (tem_acesso_operacional());

create policy tarefas_insert on tarefas for insert to authenticated
  with check (tem_acesso_lideranca());

create policy tarefas_update on tarefas for update to authenticated
  using (tem_acesso_operacional()) with check (tem_acesso_operacional());

create policy tarefas_delete on tarefas for delete to authenticated
  using (tem_acesso_lideranca());
