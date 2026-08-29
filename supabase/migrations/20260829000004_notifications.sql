-- Notifications ----------------------------------------------------------
create table public.notifications (
  id         uuid primary key default extensions.gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,   -- recipient
  actor_id   uuid references auth.users (id) on delete set null,           -- who caused it
  type       text not null check (type in (
               'friend_request', 'friend_accepted',
               'event_invite', 'event_added',
               'shuffle_committed', 'event_updated', 'event_cancelled',
               'event_reminder'
             )),
  title      text not null,
  body       text,
  event_id   uuid references public.events (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Only the recipient may mutate (mark read); rows are created by triggers /
-- SECURITY DEFINER functions running as the table owner.
create policy "users update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- RPC: mark one / all notifications read -----------------------------
create or replace function public.mark_notifications_read(_ids uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid())
    and read_at is null
    and (_ids is null or id = any(_ids));
$$;

grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Friend-request notifications --------------------------------------
create or replace function public.notify_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _requester_name text;
  _other uuid;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    _other := case when new.requested_by = new.user_low then new.user_high else new.user_low end;
    select coalesce(display_name, username::text, 'Someone')
      into _requester_name from public.profiles where id = new.requested_by;
    insert into public.notifications (user_id, actor_id, type, title, body, data)
    values (_other, new.requested_by, 'friend_request',
            'New friend request',
            _requester_name || ' wants to be friends',
            jsonb_build_object('friendship_id', new.id));

  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    _other := case when new.requested_by = new.user_low then new.user_high else new.user_low end;
    select coalesce(display_name, username::text, 'Someone')
      into _requester_name from public.profiles where id = _other;
    insert into public.notifications (user_id, actor_id, type, title, body, data)
    values (new.requested_by, _other, 'friend_accepted',
            'Friend request accepted',
            _requester_name || ' accepted your friend request',
            jsonb_build_object('friendship_id', new.id));
  end if;
  return null;
end;
$$;

create trigger friendships_notify
  after insert or update on public.friendships
  for each row execute function public.notify_friendship();

-- Event update / cancellation notifications ------------------------
create or replace function public.notify_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := (select auth.uid());
  _kind  text;
  _title text;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    _kind := 'event_cancelled';
    _title := 'Event cancelled';
  elsif (new.starts_at, new.venue, new.title) is distinct from (old.starts_at, old.venue, old.title) then
    _kind := 'event_updated';
    _title := 'Event details changed';
  else
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type, event_id, title, body, data)
  select m.user_id, _actor, _kind, new.id, _title, new.title, '{}'::jsonb
  from public.event_members m
  where m.event_id = new.id
    and m.user_id <> coalesce(_actor, '00000000-0000-0000-0000-000000000000');
  return null;
end;
$$;

create trigger events_notify_change
  after update on public.events
  for each row execute function public.notify_event_change();
