# Setup do Hope Select

Passos para deixar o ambiente rodando. Os itens do Supabase precisam ser feitos
por uma pessoa no painel — o Docker não está instalado aqui, então não dá para
subir o Postgres local.

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com/dashboard e crie um projeto.
2. Região: **South America (São Paulo)** (mais perto do cliente).
3. Guarde a **senha do banco** que você definir.

## 2. Preencher o `.env.local`

Em **Project Settings > API**, copie os valores para o `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # segredo, nunca no front
```

## 3. Desativar o cadastro público

**Authentication > Sign In / Providers** (ou **Settings**): desative
**"Allow new users to sign up"**. Só o admin cria usuários. (Requisito de segurança.)

## 4. Aplicar as migrations

**Opção A — Supabase CLI (recomendado):**

```bash
npx supabase login                       # abre o navegador
npx supabase link --project-ref <ref>    # o <ref> está na URL do projeto
npx supabase db push                     # aplica supabase/migrations/* no banco
```

**Opção B — SQL Editor:** cole e rode, **nesta ordem**, o conteúdo de:

1. `supabase/migrations/20260715120000_schema_inicial.sql`
2. `supabase/migrations/20260715120100_views_relatorios.sql`
3. `supabase/migrations/20260715120200_rls_policies.sql`

## 5. Criar o primeiro usuário admin

1. **Authentication > Users > Add user**: informe e-mail e senha e marque
   **Auto Confirm User**.
2. Copie o **UID** do usuário criado.
3. No **SQL Editor**, crie o perfil (sem isso o RLS bloqueia tudo):

```sql
insert into perfis (id, nome, papel)
values ('<UID-do-usuario>', 'Seu Nome', 'admin');
```

## 6. Rodar o app

```bash
npm run dev
```

Abra http://localhost:3000 — você cai no login. Entre com o usuário do passo 5.

---

### Observações

- A chave `service_role` só pode ser usada em código de servidor. Nunca a
  prefixe com `NEXT_PUBLIC_`.
- Dados de restrição/gravidez são sensíveis (LGPD): não logar, não expor.
- As migrations ainda não foram testadas contra um Postgres real (sem Docker
  aqui). O primeiro `db push` / execução no SQL Editor é a validação delas.
