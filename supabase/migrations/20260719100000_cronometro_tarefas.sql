alter table tarefas add column inicio timestamptz;
alter table tarefas add column fim timestamptz;
comment on column tarefas.inicio is 'Quando o professor começou a executar essa tarefa (cronômetro na Sala).';
comment on column tarefas.fim is 'Quando o professor concluiu essa tarefa.';
alter publication supabase_realtime add table public.tarefas;
