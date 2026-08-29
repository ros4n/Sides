-- The inline `exists (select ... from event_invites ...)` inside the events
-- SELECT policy triggers event_invites' own RLS (which chains through
-- event_members -> can_view_event -> events), so it never resolves true.
-- Push it into a SECURITY DEFINER helper that bypasses RLS.

create or replace function public.has_pending_invite(_event uuid, _user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_invites i
    where i.event_id = _event
      and i.invitee_id = _user
      and i.status = 'pending'
  );
$$;

grant execute on function public.has_pending_invite(uuid, uuid) to authenticated;

drop policy if exists "view events you are allowed to see" on public.events;

create policy "view events you are allowed to see"
  on public.events for select
  to authenticated
  using (
    visibility = 'public'
    or creator_id = (select auth.uid())
    or public.is_event_member(id)
    or (visibility = 'friends' and public.are_friends(creator_id, (select auth.uid())))
    or public.has_pending_invite(id)
  );

-- Same helper keeps can_view_event() correct for other tables' policies.
create or replace function public.can_view_event(_event uuid, _user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.events e
    where e.id = _event
      and (
        e.visibility = 'public'
        or e.creator_id = _user
        or public.is_event_member(_event, _user)
        or (e.visibility = 'friends' and public.are_friends(e.creator_id, _user))
        or public.has_pending_invite(_event, _user)
      )
  );
$$;
