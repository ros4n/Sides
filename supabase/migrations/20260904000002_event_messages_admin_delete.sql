-- Let event admins delete any message in their event (e.g. to clear out the
-- thread and free storage). Authors can still delete their own via the
-- policy from 20260904000001.
create policy "event admins delete any message"
  on public.event_messages for delete
  to authenticated
  using (public.is_event_admin(event_id));
