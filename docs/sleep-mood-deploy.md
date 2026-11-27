# Sono / Humor / Progresso — deploy

## Ambiente oficial
- App: UTime | Domínio: https://utime.app.br
- Repo: tiagohenrique3393/utime | Produção: `main`
- Auth/DB: Supabase projeto existente | Hosting: Cloudflare Workers Builds

## Pacote SQL único (preferido)
Cole no SQL Editor de produção:

1. **`supabase/APPLY-PROD-sleep-mood.sql`** (tabelas RLS + pin vitalício UUID)
2. **`supabase/delete-account.sql`** (reaplicar — cascade sleep/mood/prompts)
3. Se Premium vitalício ainda parcial: **`supabase/premium-plan-rpc.sql`** *antes* do passo 1

## Validação
- REST sem PGRST205 em `sleep_checkins` / `mood_checkins`
- Contas vitalícias permanecem `premium`; novos usuários `free`

## Bloqueador de automação
Sem `service_role` / Management API token neste ambiente de agent.
Não há MCP/CLI autenticado para DDL. Aplicação = SQL Editor do owner.
