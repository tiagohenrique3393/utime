-- Corrige a assinatura do contrato.
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Pode ser executado de novo. Não apaga contratos, check-ins, hábitos nem rankings.
-- O nome do parâmetro client_key permanece, para o aplicativo continuar enviando o mesmo campo.
-- Este script ainda não foi executado pelo agente.

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


-- Consulta apenas. Mostra contratos ativos que a rescisão já encerraria hoje.
-- Não altera nada. Não agenda execução automática.
select contract.id, contract.user_id, contract.starts_on, contract.ends_on, obligation.pillar, obligation.window_end
from public.challenge_contracts contract
join public.challenge_obligations obligation on obligation.contract_id = contract.id
where contract.status = 'active'
  and obligation.window_end < public.challenge_sao_paulo_date(now())
  and (
    select count(*)
    from public.challenge_checkins checkin
    where checkin.contract_id = obligation.contract_id
      and checkin.pillar = obligation.pillar
      and checkin.date_key between obligation.window_start and obligation.window_end
  ) < obligation.required_count
order by contract.id, obligation.window_end;

-- O fechamento continua acontecendo quando a pessoa abre Desafios.
-- Não há agendamento novo neste arquivo.
-- Um cron horário poderia encerrar contratos de teste já vencidos sem uma revisão antes.
