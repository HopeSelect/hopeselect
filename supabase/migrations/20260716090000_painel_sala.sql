-- Painel de sala: posição dos cards de professor (arrastáveis) e realtime.
-- Requisito do cliente: cards em janelas móveis/reposicionáveis, nunca lista;
-- e atualização automática quando a recepção aloca/finaliza um atendimento.

-- Posição do card no canvas do painel. Nulo => layout ainda não foi arrastado
-- pela recepção (o front calcula uma posição inicial em grade).
alter table professores
  add column pos_x integer,
  add column pos_y integer;

-- Realtime: sem isso, o Supabase não emite eventos postgres_changes
-- para essas tabelas e o painel não atualiza sozinho (a dor do Hostess).
alter publication supabase_realtime add table public.atendimentos;
alter publication supabase_realtime add table public.professores;
