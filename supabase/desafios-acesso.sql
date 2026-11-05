-- Liberação temporária da aba Desafios.
-- Execute este arquivo uma vez no SQL Editor, depois que supabase/desafios.sql já tiver sido aplicado.
-- Não recria tabelas, não apaga contratos e não altera o Círculo.
-- Qualquer conta autenticada passa a ler e gravar somente os próprios desafios.
-- A coluna profiles.plan e a função challenge_is_premium permanecem para uma etapa futura.

drop policy if exists challenge_drafts_own on public.challenge_drafts;
create policy challenge_drafts_own on public.challenge_drafts
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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
  if actor is null then
    raise exception 'Entre na sua conta para assinar.';
  end if;
  if accepted is not true then
    raise exception 'Confirme que leu e aceitou o contrato.';
  end if;
  select item.id into existing
  from public.challenge_contracts item
  where item.user_id = actor and item.client_key = client_key;
  if existing is not null then
    return existing;
  end if;
  perform public.settle_challenge_contracts();
  if exists (select 1 from public.challenge_contracts item where item.user_id = actor and item.status = 'active') then
    raise exception 'Encerre o contrato ativo antes de assinar outro.';
  end if;
  if signature_mode = 'typed' then
    if signature_strokes is not null or char_length(btrim(coalesce(signature_text, ''))) < 2 or char_length(btrim(signature_text)) > 80 then
      raise exception 'Digite o nome completo para assinar.';
    end if;
  elsif signature_mode = 'touch' then
    if signature_text is not null or jsonb_typeof(signature_strokes) <> 'array' then
      raise exception 'Desenhe a assinatura na tela.';
    end if;
    for stroke in select value from jsonb_array_elements(signature_strokes) loop
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
  obligations := public.challenge_build_obligations(today, duration_days, commitments);
  insert into public.challenge_contracts (
    user_id, client_key, status, duration_days, starts_on, ends_on, clause_version,
    signature_mode, signature_text, signature_strokes, accepted
  ) values (
    actor, client_key, 'active', duration_days, today, today + (duration_days - 1), 'desafios-1',
    signature_mode,
    case when signature_mode = 'typed' then btrim(signature_text) else null end,
    case when signature_mode = 'touch' then signature_strokes else null end,
    true
  ) returning id into created;
  for item in select value from jsonb_array_elements(commitments) loop
    insert into public.challenge_commitments (
      contract_id, user_id, pillar, body, frequency_kind, weekdays, weekly_times, deadline_on
    ) values (
      created,
      actor,
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
      actor,
      item->>'pillar',
      (item->>'dueOn')::date,
      (item->>'windowStart')::date,
      (item->>'windowEnd')::date,
      (item->>'requiredCount')::int
    );
  end loop;
  delete from public.challenge_drafts where user_id = actor;
  return created;
exception
  when unique_violation then
    select item.id into existing
    from public.challenge_contracts item
    where item.user_id = actor and item.client_key = client_key;
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
  if actor is null then
    raise exception 'Entre na sua conta para continuar.';
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
  if actor is null then
    raise exception 'Entre na sua conta para continuar.';
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
  if actor is null then
    raise exception 'Entre na sua conta para continuar.';
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
    'plan', case when public.challenge_is_premium(actor) then 'premium' else 'free' end,
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
  if actor is null then
    raise exception 'Entre na sua conta para continuar.';
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
