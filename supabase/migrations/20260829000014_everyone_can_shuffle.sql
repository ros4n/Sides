-- Per-event "anyone in the game can shuffle" switch --------------------
-- Complements the per-member `event_members.can_shuffle` flag: when this is
-- on, every non-watcher member may move players between teams without the
-- admin flipping each person individually.

alter table public.events
  add column if not exists everyone_can_shuffle boolean not null default false;

-- The single gatekeeper used by the team_assignments RLS policy and by every
-- shuffle RPC (claim_shuffle_editor / commit_shuffle / auto_shuffle /
-- release_shuffle_editor). Now also grants shuffle rights to non-watcher
-- members when the event opts everyone in.
create or replace function public.can_shuffle_event(_event uuid, _user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.event_members m
    join public.events e on e.id = m.event_id
    where m.event_id = _event
      and m.user_id = _user
      and (
        m.role = 'admin'
        or m.can_shuffle
        or (e.everyone_can_shuffle and m.role <> 'watcher')
      )
  );
$$;

grant execute on function public.can_shuffle_event(uuid, uuid) to authenticated;
