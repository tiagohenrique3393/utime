-- UTime: perfis ausentes e Premium temporário de teste.
-- Cole este arquivo inteiro no SQL Editor do Supabase.
-- Pode ser executado mais de uma vez.
-- Não apaga contas, hábitos, check-ins, rankings, amizades nem desafios.
-- Não altera identificadores. Não desativa RLS.
-- As duas contas abaixo existem só neste script privilegiado.
-- O aplicativo não contém estes e-mails.
-- Este script ainda não foi executado pelo agente.

insert into public.profiles (user_id, first_name, plan)
select
  users.id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data->>'first_name'), ''),
    nullif(btrim(users.raw_user_meta_data->>'name'), ''),
    ''
  ),
  'premium'
from auth.users users
where lower(users.email) in (
  'thsouza00793@gmail.com',
  'francinegodinhodossantos@gmail.com'
)
on conflict (user_id) do nothing;

update public.profiles profile
set plan = 'premium'
from auth.users users
where profile.user_id = users.id
  and lower(users.email) in (
    'thsouza00793@gmail.com',
    'francinegodinhodossantos@gmail.com'
  )
  and profile.plan is distinct from 'premium';

do $install$
begin
  execute $fn$
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    begin
      insert into public.profiles (user_id)
      values (new.id)
      on conflict (user_id) do nothing;
      return new;
    exception
      when others then
        raise warning 'perfil inicial não criado: %', sqlerrm;
        return new;
    end;
    $body$
  $fn$;
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when others then
    raise notice 'gatilho de perfil não instalado: %', sqlerrm;
end;
$install$;

create or replace function public.utime_require_premium()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.challenge_is_premium(auth.uid()) then
    raise exception 'O UTime Circle é uma função Premium.';
  end if;
end;
$$;

revoke all on function public.utime_require_premium() from public, anon, authenticated;

do $patch$
declare
  names text[] := array[
    'circle_state',
    'circle_enroll',
    'circle_leave',
    'circle_board',
    'circle_search',
    'circle_add_friend',
    'circle_remove_friend',
    'circle_accept_friend',
    'circle_decline_friend',
    'circle_history',
    'circle_friend_faces',
    'circle_avatars',
    'profile_public'
  ];
  fn text;
  def text;
  proc record;
begin
  foreach fn in array names loop
    for proc in
      select p.oid, l.lanname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
      where n.nspname = 'public'
        and p.proname = fn
    loop
      begin
        if proc.lanname <> 'plpgsql' then
          raise notice 'utime premium: % ignorada porque não é plpgsql', fn;
          continue;
        end if;
        def := pg_get_functiondef(proc.oid);
        if def ilike '%utime_require_premium%' then
          raise notice 'utime premium: % já protegida', fn;
          continue;
        end if;
        if def !~* '[[:space:]]begin[[:space:]]' then
          raise notice 'utime premium: % sem bloco begin', fn;
          continue;
        end if;
        def := regexp_replace(def, '[[:space:]]begin[[:space:]]', E'\nbegin\n  perform public.utime_require_premium();\n  ', 1, 1, 'i');
        execute def;
        raise notice 'utime premium: % protegida', fn;
      exception
        when others then
          raise notice 'utime premium: % não foi alterada: %', fn, sqlerrm;
      end;
    end loop;
  end loop;
end;
$patch$;

do $legacy$
declare
  def text;
  tag text;
  closer int;
begin
  if to_regprocedure('public.utime_ranking()') is null then
    raise notice 'utime premium: utime_ranking ausente';
    return;
  end if;
  def := pg_get_functiondef('public.utime_ranking()'::regprocedure);
  if def ilike '%utime_require_premium%' then
    raise notice 'utime premium: utime_ranking já protegida';
    return;
  end if;
  if def !~* 'language sql' then
    raise notice 'utime premium: utime_ranking não é sql';
    return;
  end if;
  tag := substring(def from 'as[[:space:]]+(\$[A-Za-z0-9_]*\$)');
  if tag is null then
    raise notice 'utime premium: utime_ranking sem corpo identificável';
    return;
  end if;
  def := regexp_replace(def, 'language sql', 'language plpgsql', 1, 1, 'i');
  def := regexp_replace(def, 'as[[:space:]]+' || tag, 'as ' || tag || E'\nbegin\n  perform public.utime_require_premium();\n  return query\n', 1, 1, 'i');
  closer := length(def) - position(reverse(tag) in reverse(def)) - length(tag) + 2;
  if closer < 1 or substr(def, closer, length(tag)) <> tag then
    raise notice 'utime premium: utime_ranking não foi alterada';
    return;
  end if;
  def := substr(def, 1, closer - 1) || E'end;\n' || tag;
  execute def;
  raise notice 'utime premium: utime_ranking protegida';
exception
  when others then
    raise notice 'utime premium: utime_ranking não foi alterada: %', sqlerrm;
end;
$legacy$;

-- Restaura o bloqueio Premium de Desafios, caso o script antigo tenha sido aplicado.
drop policy if exists challenge_drafts_own on public.challenge_drafts;
create policy challenge_drafts_own on public.challenge_drafts
for all to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.profiles profile
    where profile.user_id = auth.uid() and profile.plan = 'premium'
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.profiles profile
    where profile.user_id = auth.uid() and profile.plan = 'premium'
  )
);

create or replace function public.challenge_sign(
  client_key uuid,
  duration_days integer,
  commitments jsonb,
  signature_mode text,
  signature_text text,
  signature_strokes jsonb,
  accepted boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
<<sign_fn>>
declare
  actor uuid := auth.uid();
  today date;
  existing uuid;
  obligations jsonb;
  item jsonb;
  created uuid;
  points int := 0;
  stroke jsonb;
  point jsonb;
  usable boolean := false;
begin
  if sign_fn.actor is null then
    raise exception 'Entre na sua conta para assinar.';
  end if;
  if not public.challenge_is_premium(sign_fn.actor) then
    raise exception 'Desafios é uma função Premium.';
  end if;
  if sign_fn.accepted is not true then
    raise exception 'Confirme que leu e aceitou o contrato.';
  end if;
  select contract.id into existing
  from public.challenge_contracts contract
  where contract.user_id = sign_fn.actor and contract.client_key = sign_fn.client_key;
  if existing is not null then
    return existing;
  end if;
  perform public.settle_challenge_contracts();
  if exists (select 1 from public.challenge_contracts contract where contract.user_id = sign_fn.actor and contract.status = 'active') then
    raise exception 'Encerre o contrato ativo antes de assinar outro.';
  end if;
  if sign_fn.signature_mode = 'typed' then
    if sign_fn.signature_strokes is not null or char_length(btrim(coalesce(sign_fn.signature_text, ''))) < 2 or char_length(btrim(sign_fn.signature_text)) > 80 then
      raise exception 'Digite o nome completo para assinar.';
    end if;
  elsif sign_fn.signature_mode = 'touch' then
    if sign_fn.signature_text is not null or jsonb_typeof(sign_fn.signature_strokes) <> 'array' then
      raise exception 'Desenhe a assinatura na tela.';
    end if;
    for stroke in select value from jsonb_array_elements(sign_fn.signature_strokes) loop
      if jsonb_typeof(stroke) <> 'array' then
        raise exception 'Desenhe a assinatura na tela.';
      end if;
      if jsonb_array_length(stroke) >= 2 then
        usable := true;
      end if;
      for point in select value from jsonb_array_elements(stroke) loop
        points := points + 1;
        if points > 4000
          or jsonb_typeof(point) <> 'object'
          or (point->>'x') !~ '^[0-9]+(\.[0-9]+)?$'
          or (point->>'y') !~ '^[0-9]+(\.[0-9]+)?$'
          or (point->>'x')::numeric < 0 or (point->>'x')::numeric > 1
          or (point->>'y')::numeric < 0 or (point->>'y')::numeric > 1 then
          raise exception 'Desenhe a assinatura na tela.';
        end if;
      end loop;
    end loop;
    if not usable then
      raise exception 'Desenhe a assinatura na tela.';
    end if;
  else
    raise exception 'Escolha assinar na tela ou digitar o nome.';
  end if;
  today := public.challenge_sao_paulo_date(now());
  obligations := public.challenge_build_obligations(today, sign_fn.duration_days, sign_fn.commitments);
  insert into public.challenge_contracts (
    user_id, client_key, status, duration_days, starts_on, ends_on, clause_version,
    signature_mode, signature_text, signature_strokes, accepted
  ) values (
    sign_fn.actor, sign_fn.client_key, 'active', sign_fn.duration_days, today, today + (sign_fn.duration_days - 1), 'desafios-1',
    sign_fn.signature_mode,
    case when sign_fn.signature_mode = 'typed' then btrim(sign_fn.signature_text) else null end,
    case when sign_fn.signature_mode = 'touch' then sign_fn.signature_strokes else null end,
    true
  ) returning id into created;
  for item in select value from jsonb_array_elements(sign_fn.commitments) loop
    insert into public.challenge_commitments (
      contract_id, user_id, pillar, body, frequency_kind, weekdays, weekly_times, deadline_on
    ) values (
      created,
      sign_fn.actor,
      item->>'pillar',
      btrim(item->>'text'),
      item#>>'{frequency,kind}',
      case
        when item#>>'{frequency,kind}' = 'weekdays' then (
          select coalesce(array_agg(distinct value::smallint), array[]::smallint[])
          from jsonb_array_elements_text(item#>'{frequency,days}') as value
          where value ~ '^[0-6]$'
        )
        else null
      end,
      case when item#>>'{frequency,kind}' = 'weekly' then (item#>>'{frequency,times}')::int else null end,
      case when item#>>'{frequency,kind}' = 'deadline' then (item#>>'{frequency,date}')::date else null end
    );
  end loop;
  for item in select value from jsonb_array_elements(obligations) loop
    insert into public.challenge_obligations (
      contract_id, user_id, pillar, due_on, window_start, window_end, required_count
    ) values (
      created,
      sign_fn.actor,
      item->>'pillar',
      (item->>'dueOn')::date,
      (item->>'windowStart')::date,
      (item->>'windowEnd')::date,
      (item->>'requiredCount')::int
    );
  end loop;
  delete from public.challenge_drafts draft where draft.user_id = sign_fn.actor;
  return created;
exception
  when unique_violation then
    select contract.id into existing
    from public.challenge_contracts contract
    where contract.user_id = sign_fn.actor and contract.client_key = sign_fn.client_key;
    if existing is not null then
      return existing;
    end if;
    raise;
end;
$$;


create or replace function public.challenge_checkin(contract_id uuid, pillar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  today date;
  contract public.challenge_contracts%rowtype;
begin
  if actor is null or not public.challenge_is_premium(actor) then
    raise exception 'Desafios é uma função Premium.';
  end if;
  if pillar not in ('corpo', 'mente', 'espirito') then
    raise exception 'Pilar inválido.';
  end if;
  perform public.settle_challenge_contracts();
  today := public.challenge_sao_paulo_date(now());
  select item.* into contract
  from public.challenge_contracts item
  where item.id = contract_id and item.user_id = actor
  for update;
  if contract.id is null then
    raise exception 'Contrato não encontrado.';
  end if;
  if contract.status <> 'active' then
    raise exception 'Este contrato não aceita novos registros.';
  end if;
  if today < contract.starts_on or today > contract.ends_on then
    raise exception 'Este dia está fora do contrato.';
  end if;
  if not exists (
    select 1 from public.challenge_obligations obligation
    where obligation.contract_id = contract.id
      and obligation.pillar = challenge_checkin.pillar
      and obligation.window_start <= today
      and obligation.window_end >= today
  ) then
    raise exception 'Não há obrigação exigível hoje.';
  end if;
  insert into public.challenge_checkins (contract_id, user_id, pillar, date_key)
  values (contract.id, actor, pillar, today);
exception
  when unique_violation then
    raise exception 'Este compromisso já foi registrado hoje.';
end;
$$;

create or replace function public.challenge_acknowledge(contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.challenge_is_premium(actor) then
    raise exception 'Desafios é uma função Premium.';
  end if;
  update public.challenge_contracts
  set notice_seen_at = now()
  where id = contract_id
    and user_id = actor
    and status = 'rescinded'
    and notice_seen_at is null;
end;
$$;

create or replace function public.challenge_replace(contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.challenge_is_premium(actor) then
    raise exception 'Desafios é uma função Premium.';
  end if;
  update public.challenge_contracts
  set status = 'replaced'
  where id = contract_id
    and user_id = actor
    and status = 'active';
  if not found then
    raise exception 'Não há contrato ativo para encerrar.';
  end if;
end;
$$;

create or replace function public.challenge_frequency(item public.challenge_commitments)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case item.frequency_kind
    when 'daily' then jsonb_build_object('kind', 'daily')
    when 'weekdays' then jsonb_build_object('kind', 'weekdays', 'days', to_jsonb(item.weekdays))
    when 'weekly' then jsonb_build_object('kind', 'weekly', 'times', item.weekly_times)
    else jsonb_build_object('kind', 'deadline', 'date', item.deadline_on)
  end;
$$;

create or replace function public.challenge_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  today date;
  first_name text := '';
  draft jsonb;
  active jsonb;
  notice jsonb;
  counts jsonb;
  history jsonb;
begin
  if actor is null then
    raise exception 'Entre na sua conta para ver os desafios.';
  end if;
  if not public.challenge_is_premium(actor) then
    return jsonb_build_object('plan', 'free');
  end if;
  perform public.settle_challenge_contracts();
  today := public.challenge_sao_paulo_date(now());
  select coalesce(profile.first_name, '') into first_name
  from public.profiles profile
  where profile.user_id = actor;
  select jsonb_build_object('durationDays', draft_row.duration_days, 'commitments', draft_row.commitments)
    into draft
  from public.challenge_drafts draft_row
  where draft_row.user_id = actor;
  select jsonb_build_object(
    'id', item.id,
    'status', item.status,
    'durationDays', item.duration_days,
    'startsOn', item.starts_on,
    'endsOn', item.ends_on,
    'signedAt', item.signed_at,
    'clauseVersion', item.clause_version,
    'signatureMode', item.signature_mode,
    'signatureText', item.signature_text,
    'signatureStrokes', item.signature_strokes,
    'commitments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pillar', commitment.pillar,
        'text', commitment.body,
        'frequency', public.challenge_frequency(commitment)
      ) order by commitment.pillar)
      from public.challenge_commitments commitment
      where commitment.contract_id = item.id
    ), '[]'::jsonb),
    'obligations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pillar', obligation.pillar,
        'dueOn', obligation.due_on,
        'windowStart', obligation.window_start,
        'windowEnd', obligation.window_end,
        'requiredCount', obligation.required_count
      ))
      from public.challenge_obligations obligation
      where obligation.contract_id = item.id
    ), '[]'::jsonb),
    'checkins', coalesce((
      select jsonb_agg(jsonb_build_object('pillar', checkin.pillar, 'date', checkin.date_key))
      from public.challenge_checkins checkin
      where checkin.contract_id = item.id
    ), '[]'::jsonb)
  ) into active
  from public.challenge_contracts item
  where item.user_id = actor and item.status = 'active';
  select jsonb_build_object('id', item.id, 'failedOn', item.failure_on, 'pillar', item.failure_pillar)
    into notice
  from public.challenge_contracts item
  where item.user_id = actor and item.status = 'rescinded' and item.notice_seen_at is null
  order by item.rescinded_at desc nulls last
  limit 1;
  select jsonb_build_object(
    'concluded', count(*) filter (where item.status = 'concluded'),
    'rescinded', count(*) filter (where item.status = 'rescinded')
  ) into counts
  from public.challenge_contracts item
  where item.user_id = actor;
  select coalesce(jsonb_agg(row_to_json(entry)::jsonb), '[]'::jsonb) into history
  from (
    select item.id,
           item.status,
           item.duration_days as "durationDays",
           item.starts_on as "startsOn",
           item.ends_on as "endsOn",
           item.signed_at as "signedAt",
           coalesce(item.concluded_at, item.rescinded_at, item.signed_at) as "closedAt"
    from public.challenge_contracts item
    where item.user_id = actor
    order by coalesce(item.concluded_at, item.rescinded_at, item.signed_at) desc
  ) entry;
  return jsonb_build_object(
    'plan', 'premium',
    'today', today,
    'firstName', coalesce(first_name, ''),
    'draft', draft,
    'active', active,
    'notice', notice,
    'counts', counts,
    'history', history
  );
end;
$$;

create or replace function public.challenge_contract(contract_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  payload jsonb;
begin
  if actor is null or not public.challenge_is_premium(actor) then
    raise exception 'Desafios é uma função Premium.';
  end if;
  select jsonb_build_object(
    'id', item.id,
    'status', item.status,
    'durationDays', item.duration_days,
    'startsOn', item.starts_on,
    'endsOn', item.ends_on,
    'signedAt', item.signed_at,
    'clauseVersion', item.clause_version,
    'signatureMode', item.signature_mode,
    'signatureText', item.signature_text,
    'signatureStrokes', item.signature_strokes,
    'failureOn', item.failure_on,
    'failurePillar', item.failure_pillar,
    'failureReason', item.failure_reason,
    'concludedAt', item.concluded_at,
    'rescindedAt', item.rescinded_at,
    'commitments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pillar', commitment.pillar,
        'text', commitment.body,
        'frequency', public.challenge_frequency(commitment)
      ) order by commitment.pillar)
      from public.challenge_commitments commitment
      where commitment.contract_id = item.id
    ), '[]'::jsonb),
    'obligations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pillar', obligation.pillar,
        'dueOn', obligation.due_on,
        'windowStart', obligation.window_start,
        'windowEnd', obligation.window_end,
        'requiredCount', obligation.required_count
      ) order by obligation.due_on)
      from public.challenge_obligations obligation
      where obligation.contract_id = item.id
    ), '[]'::jsonb)
  ) into payload
  from public.challenge_contracts item
  where item.id = contract_id and item.user_id = actor;
  if payload is null then
    raise exception 'Contrato não encontrado.';
  end if;
  return payload;
end;
$$;

select users.email, users.id, profile.user_id is not null as has_profile, profile.plan, profile.first_name, profile.public_handle,
  (select count(*) from public.circle_memberships membership where membership.user_id = users.id) as memberships
from auth.users users
left join public.profiles profile on profile.user_id = users.id
where lower(users.email) in (
  'thsouza00793@gmail.com',
  'francinegodinhodossantos@gmail.com'
)
order by users.email;
