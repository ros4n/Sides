-- Server-side circuit breaker for commit_shuffle / auto_shuffle.
--
-- 2026-09-04: a client (browser tab / installed PWA) left open with a stale
-- shuffle_state.version retries commit_shuffle in a loop, failing 40001 every
-- time, and pinned prod CPU at ~90% for ~13h. The client was hardened
-- (capped retries, fixed the stale versionRef) in commit a6d585d, but that
-- fix only reaches tabs that reload — one already open when it deployed
-- keeps running the old code indefinitely. This makes the failure mode
-- structurally impossible instead of relying on every client staying
-- up to date: after a handful of failed attempts in a short window, further
-- calls are rejected instantly (a single upsert on an indexed row) before
-- they ever touch shuffle_state, no matter how a client misbehaves.

create table if not exists public.rpc_rate_limit (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        int not null default 0
);

-- Best-effort housekeeping: nobody queries old rows, but let them age out
-- rather than growing forever. Cheap since it's a PK-indexed table.
create index if not exists rpc_rate_limit_window_idx
  on public.rpc_rate_limit (window_start);

-- Returns true if the caller is still under the limit (and records the
-- attempt); false once they've exceeded _max attempts inside _window.
-- The window resets the first time it's checked after expiring, so a
-- well-behaved client that failed once ten minutes ago is unaffected.
create or replace function public.check_rate_limit(_key text, _max int, _window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  _count int;
begin
  insert into public.rpc_rate_limit (key, window_start, count)
  values (_key, now(), 1)
  on conflict (key) do update
    set count        = case when public.rpc_rate_limit.window_start < now() - _window
                             then 1 else public.rpc_rate_limit.count + 1 end,
        window_start  = case when public.rpc_rate_limit.window_start < now() - _window
                             then now() else public.rpc_rate_limit.window_start end
  returning count into _count;
  return _count <= _max;
end;
$$;

create or replace function public.commit_shuffle(
  _event uuid, _moves jsonb, _base_version bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me      uuid := (select auth.uid());
  _s       public.shuffle_state;
  _new_ver bigint;
  _move    jsonb;
  _changed boolean := false;
begin
  if not public.can_shuffle_event(_event, _me) then
    raise exception 'you do not have permission to shuffle this event';
  end if;

  -- Cheap reject BEFORE the row lock / update work: at most 8 attempts per
  -- 10s per (event, user). A wedged client gets a fast, non-retryable error
  -- instead of a full transactional round trip every time.
  if not public.check_rate_limit('shuffle:' || _event || ':' || _me, 8, interval '10 seconds') then
    raise exception 'too many shuffle attempts — please refresh the page' using errcode = 'P0001';
  end if;

  select * into _s from public.shuffle_state where event_id = _event for update;
  if not found then
    insert into public.shuffle_state (event_id) values (_event) returning * into _s;
  end if;

  if _base_version is not null and _base_version <> _s.version then
    raise exception 'stale board (have %, base %)', _s.version, _base_version
      using errcode = '40001';
  end if;

  for _move in select * from jsonb_array_elements(_moves)
  loop
    update public.team_assignments t
    set team_index = nullif(_move->>'team_index', '')::int,
        slot       = nullif(_move->>'slot', '')::int,
        updated_by = _me,
        updated_at = now()
    where t.event_id = _event
      and t.user_id = (_move->>'user_id')::uuid
      and (t.team_index is distinct from nullif(_move->>'team_index', '')::int
           or t.slot is distinct from nullif(_move->>'slot', '')::int);
    if found then _changed := true; end if;
  end loop;

  _new_ver := _s.version + 1;
  update public.shuffle_state
    set version = _new_ver,
        active_editor_id = _me,
        editor_expires_at = now() + interval '20 seconds',
        updated_at = now()
    where event_id = _event;

  if _changed then
    insert into public.notifications (user_id, actor_id, type, event_id, title, body)
    select m.user_id, _me, 'shuffle_committed', _event,
           'Teams updated', e.title
    from public.event_members m
    join public.events e on e.id = _event
    where m.event_id = _event
      and m.user_id <> _me
      and not exists (
        select 1 from public.notifications n
        where n.user_id = m.user_id and n.event_id = _event
          and n.type = 'shuffle_committed' and n.read_at is null
      );
  end if;

  return _new_ver;
end;
$$;

create or replace function public.auto_shuffle(_event uuid, _base_version bigint default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me    uuid := (select auth.uid());
  _teams int;
  _moves jsonb;
begin
  if not public.can_shuffle_event(_event, _me) then
    raise exception 'you do not have permission to shuffle this event';
  end if;

  -- Same shared budget as commit_shuffle (they hit the same event_id/me key),
  -- checked here too so a wedged auto_shuffle loop can't even reach the
  -- random-assignment query.
  if not public.check_rate_limit('shuffle:' || _event || ':' || _me, 8, interval '10 seconds') then
    raise exception 'too many shuffle attempts — please refresh the page' using errcode = 'P0001';
  end if;

  select team_count into _teams from public.events where id = _event;

  select jsonb_agg(jsonb_build_object(
           'user_id', s.user_id,
           'team_index', (s.rn % _teams),
           'slot', (s.rn / _teams)
         ))
    into _moves
  from (
    select user_id, (row_number() over (order by random()) - 1) as rn
    from public.team_assignments
    where event_id = _event
  ) s;

  return public.commit_shuffle(_event, coalesce(_moves, '[]'::jsonb), _base_version);
end;
$$;

grant execute on function public.commit_shuffle(uuid, jsonb, bigint) to authenticated;
grant execute on function public.auto_shuffle(uuid, bigint)          to authenticated;
