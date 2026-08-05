-- Foto do aluno: mesmo padrão da foto do professor (bucket próprio, leitura
-- pública, escrita só pra equipe operacional).

alter table alunos add column foto_url text;

insert into storage.buckets (id, name, public)
values ('alunos', 'alunos', true)
on conflict (id) do nothing;

create policy "fotos_alunos_leitura"
  on storage.objects for select
  using (bucket_id = 'alunos');

create policy "fotos_alunos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'alunos' and public.tem_acesso_operacional());

create policy "fotos_alunos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'alunos' and public.tem_acesso_operacional());

create policy "fotos_alunos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'alunos' and public.tem_acesso_operacional());
