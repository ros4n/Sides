-- Realtime applies RLS to DELETE events by evaluating the SELECT policy
-- against the OLD row. With the default replica identity a DELETE only
-- carries the primary key, so `can_view_event(event_id)` can't be checked
-- and the delete is withheld from other clients. FULL replica identity puts
-- every column in the OLD record so the policy passes and deletes broadcast.
alter table public.event_messages replica identity full;
