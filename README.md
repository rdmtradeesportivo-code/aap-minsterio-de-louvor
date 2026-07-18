# Ministério de Louvor

App web para organizar o ministério de louvor de uma igreja: repertório de
músicas (com cifra/letra e transposição de tom), cultos com roteiro e
escala de equipe.

Stack: [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS +
[Supabase](https://supabase.com) (Postgres, Auth e Row Level Security).

## Funcionalidades

- **Autenticação** com três níveis de acesso: `admin`, `lider` e `membro`.
- **Repertório**: cadastro de músicas com letra/cifra no formato ChordPro-lite
  (acordes entre colchetes, ex. `Ao [G]Senhor eu vou [D]louvar`) e
  transposição de tom em tempo real.
- **Cultos e ensaios**: roteiro (ordem das músicas) e escala de voluntários
  por função/instrumento, com confirmação de presença.
- **Equipe**: lista de membros, instrumentos e telefone; admins podem alterar
  o nível de acesso de cada pessoa.

## Configuração do Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, execute todo o conteúdo de
   [`supabase/schema.sql`](./supabase/schema.sql). Isso cria as tabelas,
   políticas de RLS e o gatilho que cria automaticamente um perfil (`profiles`)
   para cada novo usuário cadastrado.
3. Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.
4. Copie `.env.local.example` para `.env.local` e preencha:

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   ```

5. Todo novo cadastro entra como `membro`. Para promover o primeiro usuário a
   `admin`, rode no SQL Editor (após ele se cadastrar pelo app):

   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
   ```

   O UUID aparece em **Authentication → Users** no painel do Supabase.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Estrutura

- `src/app` — rotas (App Router). `/login`, `/cadastro` são públicas; tudo em
  `/dashboard/*` requer login (protegido pelo `src/proxy.ts`).
- `src/lib/supabase` — clients Supabase (browser, server, proxy/sessão).
- `src/lib/data` — leituras (queries) usadas pelos Server Components.
- `src/lib/actions` — Server Actions (mutações: criar/editar/excluir).
- `src/lib/chords.ts` — parser e transposição de cifras ChordPro-lite.
- `supabase/schema.sql` — schema completo do banco com RLS.

## Deploy

Qualquer plataforma que rode Next.js funciona (ex. [Vercel](https://vercel.com)).
Configure as mesmas variáveis de ambiente do `.env.local` no provedor escolhido.
