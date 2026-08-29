-- Fix: the `events` SELECT policy called can_view_event(id), which internally
-- re-queries `public.events`. During `INSERT ... RETURNING` that self-lookup
-- runs inside a STABLE SECURITY DEFINER function and cannot see the row being
-- inserted, so the creator's own insert failed the SELECT (RETURNING) check.
--
-- Inline the predicate against the row's own columns instead. Other tables
-- keep using can_view_event() — they are never self-referential to events.

drop policy if exists "view events you are allowed to see" on public.events;

create policy "view events you are allowed to see"
  on public.events for select
  to authenticated
  using (
    visibility = 'public'
    or creator_id = (select auth.uid())
    or public.is_event_member(id)
    or (visibility = 'friends' and public.are_friends(creator_id, (select auth.uid())))
    or exists (
      select 1 from public.event_invites i
      where i.event_id = id
        and i.invitee_id = (select auth.uid())
        and i.status = 'pending'
    )
  );
