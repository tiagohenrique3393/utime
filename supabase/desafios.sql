-- Desafios Premium do UTime.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Não altera hábitos, hidratação, constância, círculo, ranking nem excelência.
-- A regra de datas espelha src/lib/desafios.ts. O relógio é America/Sao_Paulo.

alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  drop constraint if exists profiles_plan_valid;

alter table public.profiles
  add constraint profiles_plan_valid check (plan in ('free', 'premium'));

create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    if new.plan is null or new.plan not in ('free', 'premium') then
      new.plan := 'free';
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.plan := 'free';
    return new;
  end if;
  new.plan := old.plan;
  return new;
end;
$$;

drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan
before insert or update on public.profiles
for each row execute function public.protect_profile_plan();

revoke all on function public.protect_profile_plan() from public, anon;
grant execute on function public.protect_profile_plan() to authenticated;

create table if not exists public.challenge_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_key uuid not null,
  status text not null,
  duration_days integer not null,
  starts_on date not null,
  ends_on date not null,
  signed_at timestamptz not null default now(),
  clause_version text not null,
  signature_mode text not null,
  signature_text text,
  signature_strokes jsonb,
  accepted boolean not null,
  rescinded_at timestamptz,
  notice_seen_at timestamptz,
  failure_on date,
  failure_pillar text,
  failure_reason text,
  concluded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint challenge_contracts_status check (status in ('active', 'concluded', 'rescinded', 'replaced')),
  constraint challenge_contracts_duration check (duration_days in (7, 14, 21, 30)),
  constraint challenge_contracts_span check (ends_on = starts_on + (duration_days - 1)),
  constraint challenge_contracts_signature check (
    (signature_mode = 'typed' and signature_text is not null and signature_strokes is null)
    or (signature_mode = 'touch' and signature_strokes is not null and signature_text is null)
  ),
  constraint challenge_contracts_accepted check (accepted)
);

create unique index if not exists challenge_contracts_client_key
  on public.challenge_contracts (user_id, client_key);

create unique index if not exists challenge_contracts_one_active
  on public.challenge_contracts (user_id)
  where status = 'active';

create table if not exists public.challenge_commitments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.challenge_contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  pillar text not null,
  body text not null,
  frequency_kind text not null,
  weekdays smallint[] ,
  weekly_times integer,
  deadline_on date,
  constraint challenge_commitments_pillar check (pillar in ('corpo', 'mente', 'espirito')),
  constraint challenge_commitments_body check (char_length(btrim(body)) between 1 and 120),
  constraint challenge_commitments_kind check (frequency_kind in ('daily', 'weekdays', 'weekly', 'deadline')),
  unique (contract_id, pillar)
);

create table if not exists public.challenge_obligations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.challenge_contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  pillar text not null,
  due_on date not null,
  window_start date not null,
  window_end date not null,
  required_count integer not null,
  constraint challenge_obligations_pillar check (pillar in ('corpo', 'mente', 'espirito')),
  constraint challenge_obligations_count check (required_count between 1 and 7),
  constraint challenge_obligations_window check (window_start <= window_end),
  unique (contract_id, pillar, due_on, window_start)
);

create table if not exists public.challenge_checkins (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.challenge_contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  pillar text not null,
  date_key date not null,
  created_at timestamptz not null default now(),
  constraint challenge_checkins_pillar check (pillar in ('corpo', 'mente', 'espirito')),
  unique (contract_id, pillar, date_key)
);

create table if not exists public.challenge_rescissions (
  contract_id uuid primary key references public.challenge_contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  failed_on date not null,
  pillar text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  duration_days integer,
  commitments jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint challenge_drafts_duration check (duration_days is null or duration_days in (7, 14, 21, 30)),
  constraint challenge_drafts_size check (octet_length(commitments::text) <= 8000)
);

alter table public.challenge_contracts enable row level security;
alter table public.challenge_commitments enable row level security;
alter table public.challenge_obligations enable row level security;
alter table public.challenge_checkins enable row level security;
alter table public.challenge_rescissions enable row level security;
alter table public.challenge_drafts enable row level security;

revoke all on table public.challenge_contracts from public, anon, authenticated;
revoke all on table public.challenge_commitments from public, anon, authenticated;
revoke all on table public.challenge_obligations from public, anon, authenticated;
revoke all on table public.challenge_checkins from public, anon, authenticated;
revoke all on table public.challenge_rescissions from public, anon, authenticated;
revoke all on table public.challenge_drafts from public, anon, authenticated;

grant select on table public.challenge_contracts to authenticated;
grant select on table public.challenge_commitments to authenticated;
grant select on table public.challenge_obligations to authenticated;
grant select on table public.challenge_checkins to authenticated;
grant select on table public.challenge_rescissions to authenticated;
grant select, insert, update, delete on table public.challenge_drafts to authenticated;

drop policy if exists challenge_contracts_select_own on public.challenge_contracts;
create policy challenge_contracts_select_own on public.challenge_contracts
for select to authenticated using (auth.uid() = user_id);

drop policy if exists challenge_commitments_select_own on public.challenge_commitments;
create policy challenge_commitments_select_own on public.challenge_commitments
for select to authenticated using (auth.uid() = user_id);

drop policy if exists challenge_obligations_select_own on public.challenge_obligations;
create policy challenge_obligations_select_own on public.challenge_obligations
for select to authenticated using (auth.uid() = user_id);

drop policy if exists challenge_checkins_select_own on public.challenge_checkins;
create policy challenge_checkins_select_own on public.challenge_checkins
for select to authenticated using (auth.uid() = user_id);

drop policy if exists challenge_rescissions_select_own on public.challenge_rescissions;
create policy challenge_rescissions_select_own on public.challenge_rescissions
for select to authenticated using (auth.uid() = user_id);

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

create or replace function public.challenge_sao_paulo_date(moment timestamptz)
returns date
language sql
stable
set search_path = ''
as $$
  select (timezone('America/Sao_Paulo', moment))::date;
$$;

create or replace function public.challenge_is_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.user_id = uid and profile.plan = 'premium'
  );
$$;

create or replace function public.challenge_build_obligations(starts_on date, duration_days integer, commitments jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  ends_on date := starts_on + (duration_days - 1);
  item jsonb;
  kind text;
  pillar text;
  body text;
  seen text[] := array[]::text[];
  days int[];
  raw_times text;
  times int;
  raw_deadline text;
  deadline date;
  cursor date;
  monday date;
  dow int;
  window_start date;
  window_end date;
  day_count int;
  matched int;
  obligations jsonb := '[]'::jsonb;
begin
  if duration_days not in (7, 14, 21, 30) then
    raise exception 'Escolha uma duração de 7, 14, 21 ou 30 dias.';
  end if;
  if jsonb_typeof(commitments) <> 'array' or jsonb_array_length(commitments) <> 3 then
    raise exception 'Informe os três compromissos.';
  end if;
  for item in select value from jsonb_array_elements(commitments) loop
    pillar := item->>'pillar';
    body := btrim(coalesce(item->>'text', ''));
    kind := item#>>'{frequency,kind}';
    if pillar not in ('corpo', 'mente', 'espirito') or pillar = any (seen) then
      raise exception 'Os três pilares são obrigatórios.';
    end if;
    seen := seen || pillar;
    if char_length(body) < 1 or char_length(body) > 120 then
      raise exception 'Escreva cada compromisso com até 120 caracteres.';
    end if;
    if kind = 'daily' then
      cursor := starts_on;
      while cursor <= ends_on loop
        obligations := obligations || jsonb_build_array(jsonb_build_object(
          'pillar', pillar, 'dueOn', cursor, 'windowStart', cursor, 'windowEnd', cursor, 'requiredCount', 1
        ));
        cursor := cursor + 1;
      end loop;
    elsif kind = 'weekdays' then
      select coalesce(array_agg(distinct value::int), array[]::int[])
        into days
      from jsonb_array_elements_text(coalesce(item#>'{frequency,days}', '[]'::jsonb)) as value
      where value ~ '^[0-6]$';
      if coalesce(cardinality(days), 0) = 0 then
        raise exception 'Escolha ao menos um dia da semana.';
      end if;
      matched := 0;
      cursor := starts_on;
      while cursor <= ends_on loop
        dow := extract(dow from cursor)::int;
        if dow = any (days) then
          matched := matched + 1;
          obligations := obligations || jsonb_build_array(jsonb_build_object(
            'pillar', pillar, 'dueOn', cursor, 'windowStart', cursor, 'windowEnd', cursor, 'requiredCount', 1
          ));
        end if;
        cursor := cursor + 1;
      end loop;
      if matched = 0 then
        raise exception 'Nenhum dia escolhido cai dentro do período.';
      end if;
    elsif kind = 'weekly' then
      raw_times := item#>>'{frequency,times}';
      if raw_times is null or raw_times !~ '^[1-7]$' then
        raise exception 'Informe de 1 a 7 vezes por semana.';
      end if;
      times := raw_times::int;
      monday := starts_on - ((extract(dow from starts_on)::int + 6) % 7);
      while monday <= ends_on loop
        window_start := greatest(monday, starts_on);
        window_end := least(monday + 6, ends_on);
        if window_start <= window_end then
          day_count := (window_end - window_start) + 1;
          obligations := obligations || jsonb_build_array(jsonb_build_object(
            'pillar', pillar,
            'dueOn', window_end,
            'windowStart', window_start,
            'windowEnd', window_end,
            'requiredCount', least(times, day_count)
          ));
        end if;
        monday := monday + 7;
      end loop;
    elsif kind = 'deadline' then
      raw_deadline := item#>>'{frequency,date}';
      if raw_deadline is null or raw_deadline !~ '^\d{4}-\d{2}-\d{2}$' then
        raise exception 'Escolha um prazo dentro do período.';
      end if;
      deadline := raw_deadline::date;
      if deadline < starts_on or deadline > ends_on then
        raise exception 'Escolha um prazo dentro do período.';
      end if;
      obligations := obligations || jsonb_build_array(jsonb_build_object(
        'pillar', pillar, 'dueOn', deadline, 'windowStart', starts_on, 'windowEnd', deadline, 'requiredCount', 1
      ));
    else
      raise exception 'Defina a frequência de cada compromisso.';
    end if;
  end loop;
  if not ('corpo' = any (seen) and 'mente' = any (seen) and 'espirito' = any (seen)) then
    raise exception 'Informe os três compromissos.';
  end if;
  return obligations;
end;
$$;

create or replace function public.settle_challenge_contracts(p_now timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  moment timestamptz := case when actor is null then coalesce(p_now, now()) else now() end;
  today date := public.challenge_sao_paulo_date(moment);
  contract record;
  missed record;
  updated uuid;
begin
  for contract in
    select item.id, item.user_id, item.ends_on
    from public.challenge_contracts item
    where item.status = 'active'
      and (actor is null or item.user_id = actor)
    order by item.id
    for update
  loop
    select obligation.pillar, obligation.window_end
      into missed
    from public.challenge_obligations obligation
    where obligation.contract_id = contract.id
      and obligation.window_end < today
      and (
        select count(*)
        from public.challenge_checkins checkin
        where checkin.contract_id = obligation.contract_id
          and checkin.pillar = obligation.pillar
          and checkin.date_key between obligation.window_start and obligation.window_end
      ) < obligation.required_count
    order by obligation.window_end, obligation.pillar
    limit 1;

    if found then
      updated := null;
      update public.challenge_contracts
      set status = 'rescinded',
          rescinded_at = moment,
          failure_on = missed.window_end,
          failure_pillar = missed.pillar,
          failure_reason = 'obrigação não cumprida'
      where id = contract.id
        and status = 'active'
      returning id into updated;
      if updated is not null then
        insert into public.challenge_rescissions (contract_id, user_id, failed_on, pillar, reason)
        values (contract.id, contract.user_id, missed.window_end, missed.pillar, 'obrigação não cumprida')
        on conflict (contract_id) do nothing;
      end if;
    elsif today > contract.ends_on then
      update public.challenge_contracts
      set status = 'concluded',
          concluded_at = moment
      where id = contract.id
        and status = 'active';
    end if;
  end loop;
end;
$$;

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

revoke all on function public.challenge_sao_paulo_date(timestamptz) from public, anon;
revoke all on function public.challenge_is_premium(uuid) from public, anon, authenticated;
revoke all on function public.challenge_build_obligations(date, integer, jsonb) from public, anon, authenticated;
revoke all on function public.settle_challenge_contracts(timestamptz) from public, anon;
revoke all on function public.challenge_sign(uuid, integer, jsonb, text, text, jsonb, boolean) from public, anon;
revoke all on function public.challenge_checkin(uuid, text) from public, anon;
revoke all on function public.challenge_acknowledge(uuid) from public, anon;
revoke all on function public.challenge_replace(uuid) from public, anon;
revoke all on function public.challenge_frequency(public.challenge_commitments) from public, anon, authenticated;
revoke all on function public.challenge_state() from public, anon;
revoke all on function public.challenge_contract(uuid) from public, anon;

grant execute on function public.settle_challenge_contracts(timestamptz) to authenticated;
grant execute on function public.challenge_sign(uuid, integer, jsonb, text, text, jsonb, boolean) to authenticated;
grant execute on function public.challenge_checkin(uuid, text) to authenticated;
grant execute on function public.challenge_acknowledge(uuid) to authenticated;
grant execute on function public.challenge_replace(uuid) to authenticated;
grant execute on function public.challenge_state() to authenticated;
grant execute on function public.challenge_contract(uuid) to authenticated;

alter function public.protect_profile_plan() owner to postgres;
alter function public.challenge_is_premium(uuid) owner to postgres;
alter function public.settle_challenge_contracts(timestamptz) owner to postgres;
alter function public.challenge_sign(uuid, integer, jsonb, text, text, jsonb, boolean) owner to postgres;
alter function public.challenge_checkin(uuid, text) owner to postgres;
alter function public.challenge_acknowledge(uuid) owner to postgres;
alter function public.challenge_replace(uuid) owner to postgres;
alter function public.challenge_state() owner to postgres;
alter function public.challenge_contract(uuid) owner to postgres;

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'settle-challenge-contracts') then
      perform cron.schedule(
        'settle-challenge-contracts',
        '5 * * * *',
        'select public.settle_challenge_contracts()'
      );
    end if;
  end if;
exception
  when others then
    null;
end;
$cron$;
