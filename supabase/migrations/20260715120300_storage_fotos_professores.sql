-- Bucket para as fotos dos professores.
-- Público na leitura (a foto aparece nos cards); escrita só para a equipe.

insert into storage.buckets (id, name, public)
values ('professores', 'professores', true)
on conflict (id) do nothing;

-- Leitura pública das fotos.
create policy "fotos_professores_leitura"
  on storage.objects for select
  using (bucket_id = 'professores');

-- Envio/alteração/remoção só para usuários da equipe (admin/lider/recepcao).
create policy "fotos_professores_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'professores' and public.tem_acesso_operacional());

create policy "fotos_professores_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'professores' and public.tem_acesso_operacional());

create policy "fotos_professores_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'professores' and public.tem_acesso_operacional());
