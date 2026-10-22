-- UTime: diagnóstico somente leitura da exclusão de conta.
-- Rode este arquivo no SQL Editor depois de instalar o script da exclusão.
-- Ele não grava, não apaga e não troca funções.
-- Confira o resultado antes de usar a exclusão em uma conta real.
--
-- on_delete: a = no action, r = restrict, c = cascade, n = set null, d = set default.
-- Um valor diferente de c em public ou storage, com linhas da conta, impede a exclusão.
-- O schema auth aparece aqui só para inspeção. A função não percorre essas tabelas.
-- command da política: r = leitura, a = inclusão, w = alteração, d = remoção, * = todas.

select current_user as current_user, session_user as session_user;

select n.nspname as schema_name,
       c.relname as table_name,
       a.attname as column_name,
       con.confdeltype as on_delete
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_attribute a
  on a.attrelid = c.oid
 and a.attnum = con.conkey[1]
 and not a.attisdropped
where con.contype = 'f'
  and con.confrelid = 'auth.users'::regclass
order by 1, 2, 3;

select n.nspname as schema_name,
       p.proname as function_name,
       pg_catalog.pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('delete_own_account', 'sanitize_exit_comment', 'purge_account_exit_survey');

select pol.polname as policy_name,
       pol.polcmd as command,
       pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
       pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
from pg_catalog.pg_policy pol
where pol.polrelid = 'storage.objects'::regclass
order by pol.polname;
