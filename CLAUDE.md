# Projeto: Sistema de Gestão de Sala para Academia

## O que é

Software que substitui o "Hostess V.01", um sistema desktop Windows legado usado hoje por uma academia para controlar, em tempo real, quais alunos estão treinando com quais professores.

O Hostess foi feito por um ex-professor da academia, roda em rede local e é a dor central do cliente:

- Trava e fecha no meio do atendimento
- Corrompe o banco de dados ("database deslocada")
- Depende do criador original para qualquer conserto
- Os cards não atualizam automaticamente: quando o líder lança uma tarefa nova, a recepção precisa fechar o card do professor, reabrir e relançar todos os alunos dele um por um

Este projeto substitui **apenas** o Hostess. A academia usa também o sistema Pacto (matrícula, planos, app do aluno, tablet com fichas de treino), que permanece e está fora do escopo.

## Escopo do MVP (entrega para a próxima semana)

Este é um **MVP com prazo curto**. A diretriz que vence qualquer dúvida é: **manter o mais simples possível** e entregar o núcleo funcionando.

- **Usuários do MVP: apenas recepção, líder e admin.** O professor **não** acessa o sistema nesta fase (sem app, sem login de professor). O acesso do professor à própria fila/tarefas é fase futura.
- **Sem automação de direcionamento aluno→professor.** A recepção aloca manualmente. Só implementar sugestão se for trivial; caso contrário, fica para depois.
- **Segurança é prioridade máxima.** É um webapp exposto na internet com dados pessoais e de saúde de alunos (LGPD). Redobrar o cuidado para que ninguém de fora acesse: signup desativado, RLS em tudo, `service_role` só no servidor.

## Escala da operação

- ~120 alunos atendidos por período (manhã / tarde / noite)
- Dezenas de professores em rodízio
- Academia **não tem catraca e não quer ter**
- Toda entrada e saída de aluno é lançada hoje manualmente pela recepcionista

## Requisitos inegociáveis do cliente

Estes não são preferências, são condições. O cliente foi enfático sobre cada um:

1. **Layout em cards/janelas móveis e reposicionáveis. Nunca em lista.** Uma tentativa anterior em formato de lista falhou e foi rejeitada. O motivo é a velocidade do atendimento de emergência — a recepção precisa de leitura espacial, não de scroll.
2. **Foto dos professores nos cards.** A recepção associa foto ao nome mais rápido que texto.
3. **Alertas do aluno visíveis na busca**: classificação por cor, restrições, gravidez, preferências ("só treina com mulher"), e dias sem acesso.
4. **A recepção é quem aloca aluno a professor.** Regra de negócio: professor não escolhe aluno, aluno não escolhe professor. No MVP a alocação é 100% manual; automação de sugestão fica para fase futura.
5. **Exportação para Excel obrigatória** nos relatórios.

## Classificação do aluno

- `A` — sem restrições (verde)
- `B` — leves restrições (amarelo)
- `C` — com restrições (vermelho)
- `R` — resgate / aluno faltoso (roxo)

Alertas adicionais são texto livre associado ao aluno: "GRAVIDA", "só treina com mulher", "cheque a devolver". Aparecem em destaque sempre que o aluno é consultado.

## Fluxo de trabalho atual (que o sistema vai automatizar)

1. Aluno chega → recepcionista digita o nome → vê classificação, alertas e "Acesso há X dias"
2. Recepcionista aloca o aluno em um card de professor → registra hora de início
3. Professor avisa que terminou → recepcionista marca o fim → gera o registro de atendimento
4. Líder lança tarefas dos professores (prescrição de treino, laudo, momento coach) um dia antes, uma a uma
5. Recepcionista anota manualmente o horário de lanche de cada professor
6. Relatórios: exporta atendimentos → **redigita tudo à mão** em outra planilha → monta gráficos à mão

O passo 6 deixa de existir no sistema novo: os dados nascem estruturados no fluxo, os dashboards se calculam sozinhos.

## Stack

- Next.js + TypeScript (App Router)
- Supabase: Postgres, Auth, Realtime, Storage
- Deploy na Vercel
- Tailwind CSS

Escolhas justificadas pelas dores: Realtime nativo resolve o "card não atualiza"; Postgres gerenciado com backup automático resolve o "database deslocada"; RLS dá a camada de segurança sem construir do zero.

## Modelo de dados

- `alunos` — matrícula, nome, telefone, classificação (A/B/C/R), restrições, observações, último acesso, origem
- `professores` — nome, função, foto, horário de trabalho, gênero (necessário para a regra "só treina com mulher"). A foto é enviada por **upload de arquivo ou câmera** (nunca por URL digitada) e vai para o bucket público `professores` do Storage; guardamos a URL pública em `foto_url`.
- `atendimentos` — aluno, professor, início, fim, data. **Duração é calculada, não armazenada.**
- `tarefas` — aluno, professor, tipo (prescrição / laudo / momento coach), data, status
- `lanches` — professor, início, fim
- `perfis` — vínculo com auth.users, papel: admin, líder, recepção, professor. No MVP só admin/líder/recepção têm login; o papel `professor` já existe no enum, mas sem acesso ao sistema ainda.

Todos os relatórios saem de views SQL sobre `atendimentos`. Nada de agregação no front.

## Segurança

- **Signup público desativado.** Só o admin cria usuários.
- **RLS obrigatório em todas as tabelas.** No MVP, acesso é restrito a usuários autenticados dos papéis recepção, líder e admin — todos enxergam a sala. As políticas por papel mais granulares (professor vê só a própria fila/tarefas) entram quando o app do professor for implementado. A regra vive no banco, não no front.
- Chave `anon` no client. `service_role` **nunca** no front — apenas em rotas de servidor.
- Check-in por QR (fase 2): token rotativo com validade curta, senão o aluno fotografa o QR e faz check-in de casa.

Restrições médicas e gravidez são dado sensível sob a LGPD. Tratar com o cuidado correspondente: sem logs desses campos, sem exposição em endpoints públicos.

## Ordem de construção

1. Scaffold + Supabase + auth + papéis
2. CRUD de professores e alunos (foto, classificações, alertas)
3. Painel de sala: cards arrastáveis, alocação, início/fim de atendimento, realtime
4. Tarefas dos professores
5. Relatórios e exportação xlsx / PDF
6. Lanche self-service e app do professor (PWA)

Do passo 1 ao 5, o Hostess já pode ser desligado.

## Estado atual (o que já está pronto)

- **Passo 1 ✅** — scaffold Next.js 16 + TS + Tailwind (App Router, `src/`), clientes Supabase (`@supabase/ssr`) em `src/lib/supabase/` e refresh/proteção de sessão em `src/proxy.ts`. Migrations aplicadas no projeto Supabase (ref `rwotekhbsmoqxbkbyzng`). Existe um usuário admin em `perfis`.
- **Login ✅** — `src/app/login`, com signup desativado no painel. Sem sessão o `proxy.ts` manda para `/login`.
- **Passo 2 ✅** — CRUD de professores (`src/app/professores`) e alunos (`src/app/alunos`), incluindo foto por upload/câmera, classificação por cor, alertas e busca por nome.
- **Storage ✅** — bucket público `professores` (migration `..._storage_fotos_professores.sql`), leitura pública e escrita só para a equipe.

Setup do ambiente documentado em `SETUP.md`. Para aplicar novas migrations: `npx supabase db push` (o projeto já está linkado; o aviso de Docker no fim é inofensivo).

- **Passo 3 ✅** — painel de sala (`src/app/sala`) com cards de professor arrastáveis (posição persistida em `pos_x`/`pos_y`), alocação manual de aluno com alertas visíveis, início/fim de atendimento, e atualização em tempo real via Supabase Realtime (publication `supabase_realtime` cobrindo `atendimentos` e `professores`).

**Próximo:** passo 4 (tarefas dos professores).

## Fases futuras (não implementar agora)

- Check-in do aluno por QR code no celular, alimentando uma fila de "chegaram" na tela da recepção
- Direcionamento automático aluno → professor, respeitando restrições rígidas e balanceando carga. Implementar primeiro como sugestão de um clique, com o modo automático atrás de um toggle.
- Dashboard customizável com widgets arrastáveis
- Integração com a Pacto (pendente descobrir se há API ou export)

## Convenções

- Código e comentários em português quando forem termos de domínio (aluno, professor, atendimento, prescrição). Não traduzir para inglês: o domínio do cliente é em português e a tradução gera ambiguidade.
- Migrations SQL versionadas no repositório, nunca alterações feitas direto pelo painel do Supabase.
- Componentes pequenos e legíveis. Sem abstração prematura.
- Nada de localStorage para dados de negócio. Estado de sessão vem do Supabase.

## Primeira tarefa

Escrever as migrations SQL completas: tabelas, tipos enum, views de relatório e políticas RLS. No MVP as políticas liberam leitura/escrita para usuários autenticados dos papéis recepção/líder/admin; a granularidade por professor fica para quando o app do professor existir. Com o banco de pé, o resto é rápido.
