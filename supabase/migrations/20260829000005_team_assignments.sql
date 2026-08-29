-- Team assignments -----------------------------------------------------
-- The committed source of truth for the live shuffle board. One row per
-- player per event. team_index NULL = still in the unassigned pool.
create table public.team_assignments (
  id         uuid primary key default extensions.gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  team_index int check (team_index is null or team_index >= 0),
  slot       int,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index team_assignments_event_idx on public.team_assignments (event_id);

alter table public.team_assignments enable row level security;

create policy "view the board for events you can see"
  on public.team_assignments for select
  to authenticated
  using (public.can_view_event(event_id));

-- Direct writes are allowed for shufflers as a fallback, but the app always
-- goes through commit_shuffle() so the version counter stays authoritative.
create policy "shufflers can write the board"
  on public.team_assignments for all
  to authenticated
  using (public.can_shuffle_event(event_id))
  with check (public.can_shuffle_event(event_id));

-- Now that team_assignments exists, wire the membership -> board sync
-- (function defined in the events migration).
create trigger event_members_sync_board
  after insert or update of role on public.event_members
  for each row execute function public.sync_member_board();

-- ------------------------------------------------------------------
-- Live shuffle: soft editor lock
-- ------------------------------------------------------------------
create or replace function public.claim_shuffle_editor(_event uuid)
returns table (ok boolean, active_editor_id uuid, editor_expires_at timestamptz, version bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me uuid := (select auth.uid());
  _s  public.shuffle_state;
begin
  if not public.can_shuffle_event(_event, _me) then
    raise exception 'you do not have permission to shuffle this event';
  end if;

  select * into _s from public.shuffle_state where event_id = _event for update;
  if not found then
    insert into public.shuffle_state (event_id) values (_event) returning * into _s;
  end if;

  if _s.active_editor_id is null
     or _s.active_editor_id = _me
     or _s.editor_expires_at < now() then
    update public.shuffle_state
      set active_editor_id = _me,
          editor_expires_at = now() + interval '20 seconds',
          updated_at = now()
      where event_id = _event
      returning * into _s;
    return query select true, _s.active_editor_id, _s.editor_expires_at, _s.version;
  else
    return query select false, _s.active_editor_id, _s.editor_expires_at, _s.version;
  end if;
end;
$$;

create or replace function public.heartbeat_shuffle_editor(_event uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.shuffle_state
  set editor_expires_at = now() + interval '20 seconds', updated_at = now()
  where event_id = _event and active_editor_id = (select auth.uid());
$$;

create or replace function public.release_shuffle_editor(_event uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.shuffle_state
  set active_editor_id = null, editor_expires_at = null, updated_at = now()
  where event_id = _event and active_editor_id = (select auth.uid());
$$;

-- ------------------------------------------------------------------
-- Live shuffle: atomic commit
--   _moves: [{ "user_id": uuid, "team_index": int|null, "slot": int|null }, ...]
--   _base_version: the version the client started from; NULL to force.
-- Returns the new version.
-- ------------------------------------------------------------------
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

  -- Notify other members that teams moved (coalesced: skip if they already
  -- have an unread shuffle notification for this event).
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

-- Balanced random auto-shuffle, computed server-side so every client
-- converges on the same result. Returns the new version.
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

grant execute on function public.claim_shuffle_editor(uuid)          to authenticated;
grant execute on function public.heartbeat_shuffle_editor(uuid)      to authenticated;
grant execute on function public.release_shuffle_editor(uuid)        to authenticated;
grant execute on function public.commit_shuffle(uuid, jsonb, bigint) to authenticated;
grant execute on function public.auto_shuffle(uuid, bigint)          to authenticated;
