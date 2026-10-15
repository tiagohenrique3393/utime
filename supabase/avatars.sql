-- Fotos de perfil do UTime.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Não altera pontuação, hábitos, RLS das outras tabelas nem as funções do ranking.

alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profiles
  drop constraint if exists profiles_avatar_path_format;

alter table public.profiles
  add constraint profiles_avatar_path_format
  check (
    avatar_path is null
    or avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpeg|png)$'
  );

create or replace function public.protect_avatar_path()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.avatar_path is not distinct from old.avatar_path then
    return new;
  end if;
  if new.avatar_path is null then
    return new;
  end if;
  if new.avatar_path !~ ('^' || new.user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpeg|png)$') then
    raise exception 'invalid avatar path';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_avatar_path on public.profiles;
create trigger profiles_protect_avatar_path
before insert or update on public.profiles
for each row execute function public.protect_avatar_path();

revoke all on function public.protect_avatar_path() from public, anon;
grant execute on function public.protect_avatar_path() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ ('^' || (select auth.uid()::text) || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpeg|png)$')
);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create or replace function public.circle_avatars(ids uuid[])
returns table (
  user_id uuid,
  avatar_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if ids is null or cardinality(ids) = 0 then
    return;
  end if;
  if cardinality(ids) > 200 then
    raise exception 'invalid avatar query';
  end if;
  return query
  select profile.user_id, profile.avatar_path
  from public.profiles profile
  where profile.user_id = any(ids)
    and profile.avatar_path is not null
    and (
      profile.user_id = uid
      or exists (
        select 1
        from public.circle_memberships membership
        where membership.user_id = profile.user_id
          and membership.left_at is null
      )
    );
end;
$$;

revoke all on function public.circle_avatars(uuid[]) from public, anon;
grant execute on function public.circle_avatars(uuid[]) to authenticated;
