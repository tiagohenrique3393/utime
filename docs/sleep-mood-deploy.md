# Sono / Humor / Progresso — deploy

## Ambiente oficial
- App: UTime
- Domínio: https://utime.app.br
- Repo: tiagohenrique3393/utime
- Branch produção: `main`
- Auth/DB: Supabase projeto existente (`svsxqpejzqejcvlshost`)
- Hosting: Cloudflare Workers/Pages via GitHub

## SQL a executar no SQL Editor (produção), nesta ordem
1. `supabase/sleep-mood-checkins.sql` — tabelas RLS de sono/humor/prompts
2. `supabase/delete-account.sql` — reaplicar (inclui cascade das novas tabelas)
3. `supabase/premium-plan-rpc.sql` — se ainda parcial
4. `supabase/premium-lifetime-uuid-pin.sql` — pin UUID vitalício sem rebaixar pagos

Não há service_role no cliente. Migrações são incrementais (`create if not exists`).

## Bloqueador de automação
O agente não possui chave `service_role` / Management API token no ambiente.
Aplicação SQL em produção exige execução autorizada no SQL Editor do projeto Supabase
ou um pipeline privilegiado ainda não configurado neste ambiente.
