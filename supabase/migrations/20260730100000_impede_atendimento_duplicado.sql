-- Limpa duplicados existentes: se o mesmo aluno tem 2+ atendimentos
-- abertos ao mesmo tempo, mantém só um (o critério de desempate é
-- arbitrário mas seguro — ctid é o identificador físico da linha).
delete from atendimentos a
using atendimentos b
where a.aluno_id = b.aluno_id
  and a.fim is null
  and b.fim is null
  and a.ctid > b.ctid;

-- Trava a nível de banco: nunca mais deixa existir 2 atendimentos abertos
-- pro mesmo aluno, mesmo que duas pessoas cliquem quase ao mesmo tempo em
-- máquinas diferentes. Antes essa regra só existia no código (uma consulta
-- antes de gravar), o que não protege contra 2 cliques simultâneos.
create unique index idx_atendimentos_aluno_aberto_unico
on atendimentos (aluno_id)
where fim is null;
