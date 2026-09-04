-- Restore commit_shuffle() + auto_shuffle() after the retry-storm mitigation.
--
-- On 2026-09-04 a wedged board client looping commit_shuffle pinned the hosted
-- DB at ~90% CPU (~100 `stale board` errors/sec for ~13h). As an emergency stop
-- both RPCs were replaced in the SQL editor with a stub that raises
-- `shuffle paused for maintenance` (P0001) so calls failed instantly instead of
-- retrying. This migration re-creates the real functions verbatim from
-- 20260829000005_team_assignments.sql.
--
-- Apply this ONLY after the hardened client (commit a6d585d: capped retries,
-- versionRef no longer mutated in render, no commits while document.hidden) is
-- deployed, so old looping tabs can't resume the storm the moment the RPCs work.

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

grant execute on function public.commit_shuffle(uuid, jsonb, bigint) to authenticated;
grant execute on function public.auto_shuffle(uuid, bigint)          to authenticated;
