-- Board chat --------------------------------------------------------
-- Lightweight per-event message thread, shown on the shuffle board so the
-- crew can talk while teams are being sorted. Persistent so someone opening
-- the board mid-session sees recent context.

create table public.event_messages (
  id         uuid primary key default extensions.gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index event_messages_event_idx
  on public.event_messages (event_id, created_at);

alter table public.event_messages enable row level security;

-- Read: anyone allowed to see the event (members, invitees, friends of the
-- creator on a friends event, anyone on a public one).
create policy "view messages for visible events"
  on public.event_messages for select
  to authenticated
  using (public.can_view_event(event_id));

-- Post: any event member (players, admins and watchers), as themselves.
create policy "members post messages"
  on public.event_messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_event_member(event_id)
  );

-- Authors can delete their own messages.
create policy "authors delete their own messages"
  on public.event_messages for delete
  to authenticated
  using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.event_messages;
