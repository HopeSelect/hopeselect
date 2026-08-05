-- Sem isso, cadastrar/editar aluno não dispara o aviso de tempo real —
-- é por isso que a Home não atualizava sozinha quando um aluno era criado.
alter publication supabase_realtime add table public.alunos;
