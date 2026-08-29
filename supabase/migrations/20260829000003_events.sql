-- Events -----------------------------------------------------------------
create table public.events (
  id               uuid primary key default extensions.gen_random_uuid(),
  creator_id       uuid not null references auth.users (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 120),
  description      text check (description is null or char_length(description) <= 2000),
  venue            text check (venue is null or char_length(venue) <= 200),
  starts_at        timestamptz not null,
  duration_min     int not null default 60 check (duration_min between 15 and 600),
  team_count       int not null default 2 check (team_count between 2 and 8),
  players_per_team int not null default 5 check (players_per_team between 1 and 15),
  visibility       text not null default 'invite_only'
                   check (visibility in ('invite_only', 'friends', 'public')),
  status           text not null default 'scheduled'
                   check (status in ('draft', 'scheduled', 'live', 'done', 'cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index events_creator_idx    on public.events (creator_id);
create index events_starts_at_idx   on public.events (starts_at);
create index events_visibility_idx  on public.events (visibility);

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- Event members --------------------------------------------------------
-- role: admin  -> full control of the event
--       player -> appears on the shuffle board
--       watcher-> can see the event + board, never on a team
create table public.event_members (
  id          uuid primary key default extensions.gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'player'
              check (role in ('admin', 'player', 'watcher')),
  can_shuffle boolean not null default false,
  can_invite  boolean not null default false,
  joined_at   timestamptz not null default now(),
  unique (event_id, user_id)
);

create index event_members_event_idx on public.event_members (event_id);
create index event_members_user_idx  on public.event_members (user_id);

-- Soft lock + version counter for the live shuffle board --------------
create table public.shuffle_state (
  event_id         uuid primary key references public.events (id) on delete cascade,
  version          bigint not null default 0,
  active_editor_id uuid references auth.users (id) on delete set null,
  editor_expires_at timestamptz,
  updated_at       timestamptz not null default now()
);

-- On event creation: add the creator as an admin and seed shuffle_state.
create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.event_members (event_id, user_id, role, can_shuffle, can_invite)
  values (new.id, new.creator_id, 'admin', true, true)
  on conflict (event_id, user_id) do nothing;

  insert into public.shuffle_state (event_id) values (new.id)
  on conflict (event_id) do nothing;

  return new;
end;
$$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();

-- Membership <-> board sync -----------------------------------------
-- Players get a board slot (in the unassigned pool); watchers do not.
create or replace function public.sync_member_board()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.role = 'player' then
      insert into public.team_assignments (event_id, user_id)
      values (new.event_id, new.user_id)
      on conflict (event_id, user_id) do nothing;
    else
      delete from public.team_assignments
      where event_id = new.event_id and user_id = new.user_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;
-- trigger is attached in the team_assignments migration (table must exist first)

-- ------------------------------------------------------------------
-- Access-control helper functions (SECURITY DEFINER => bypass RLS,
-- which breaks the events <-> event_members policy recursion).
-- ------------------------------------------------------------------
create or replace function public.is_event_member(_event uuid, _user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_members m
    where m.event_id = _event and m.user_id = _user
  );
$$;

create or replace function public.is_event_admin(_event uuid, _user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_members m
    where m.event_id = _event and m.user_id = _user and m.role = 'admin'
  );
$$;

create or replace function public.can_shuffle_event(_event uuid, _user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_members m
    where m.event_id = _event and m.user_id = _user
      and (m.role = 'admin' or m.can_shuffle)
  );
$$;

create or replace function public.can_invite_to_event(_event uuid, _user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_members m
    where m.event_id = _event and m.user_id = _user
      and (m.role = 'admin' or m.can_invite)
  );
$$;

-- The privacy core: who is allowed to know an event exists.
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
      )
  );
$$;

grant execute on function public.is_event_member(uuid, uuid)     to authenticated;
grant execute on function public.is_event_admin(uuid, uuid)      to authenticated;
grant execute on function public.can_shuffle_event(uuid, uuid)   to authenticated;
grant execute on function public.can_invite_to_event(uuid, uuid) to authenticated;
grant execute on function public.can_view_event(uuid, uuid)      to authenticated;

-- RPC: an admin/inviter directly adds an existing user to the event ----
create or replace function public.add_event_member(
  _event uuid, _user uuid, _role text default 'player'
)
returns public.event_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me  uuid := (select auth.uid());
  _row public.event_members;
begin
  if not public.can_invite_to_event(_event, _me) then
    raise exception 'not allowed to add members to this event';
  end if;
  if _role not in ('player', 'watcher', 'admin') then
    raise exception 'invalid role';
  end if;
  if _role = 'admin' and not public.is_event_admin(_event, _me) then
    raise exception 'only an admin can add another admin';
  end if;

  insert into public.event_members (event_id, user_id, role)
  values (_event, _user, _role)
  on conflict (event_id, user_id) do update set role = excluded.role
  returning * into _row;

  -- notify the added user (skip self-adds)
  if _user <> _me then
    insert into public.notifications (user_id, actor_id, type, event_id, title, body, data)
    values (
      _user, _me, 'event_added', _event,
      'You were added to an event',
      (select title from public.events where id = _event),
      jsonb_build_object('role', _role)
    );
  end if;

  return _row;
end;
$$;

grant execute on function public.add_event_member(uuid, uuid, text) to authenticated;

-- RPC: update a member's role / permissions (admins only) -------------
create or replace function public.update_event_member(
  _event uuid, _user uuid,
  _role text default null, _can_shuffle boolean default null, _can_invite boolean default null
)
returns public.event_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me  uuid := (select auth.uid());
  _row public.event_members;
begin
  if not public.is_event_admin(_event, _me) then
    raise exception 'only an event admin can change permissions';
  end if;

  update public.event_members m
  set role        = coalesce(_role, m.role),
      can_shuffle = coalesce(_can_shuffle, m.can_shuffle),
      can_invite  = coalesce(_can_invite, m.can_invite)
  where m.event_id = _event and m.user_id = _user
  returning * into _row;

  if not found then raise exception 'member not found'; end if;
  return _row;
end;
$$;

grant execute on function public.update_event_member(uuid, uuid, text, boolean, boolean) to authenticated;

-- RPC: remove a member (admin removes anyone; anyone can remove self) --
create or replace function public.remove_event_member(_event uuid, _user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me uuid := (select auth.uid());
begin
  if _user <> _me and not public.is_event_admin(_event, _me) then
    raise exception 'not allowed';
  end if;
  if _user = (select creator_id from public.events where id = _event) then
    raise exception 'the event creator cannot be removed';
  end if;
  delete from public.event_members where event_id = _event and user_id = _user;
end;
$$;

grant execute on function public.remove_event_member(uuid, uuid) to authenticated;

-- RLS: events ------------------------------------------------------
alter table public.events enable row level security;

create policy "view events you are allowed to see"
  on public.events for select
  to authenticated
  using (public.can_view_event(id));

create policy "any authenticated user can create an event"
  on public.events for insert
  to authenticated
  with check (creator_id = (select auth.uid()));

create policy "event admins can update the event"
  on public.events for update
  to authenticated
  using (public.is_event_admin(id))
  with check (public.is_event_admin(id));

create policy "event admins can delete the event"
  on public.events for delete
  to authenticated
  using (public.is_event_admin(id));

-- RLS: event_members --------------------------------------------
alter table public.event_members enable row level security;

create policy "view members of events you can see"
  on public.event_members for select
  to authenticated
  using (user_id = (select auth.uid()) or public.can_view_event(event_id));

-- Writes go through the RPCs above; also allow the creator's own initial
-- row (inserted by the SECURITY DEFINER trigger, but keep a safety net).
create policy "event admins manage members"
  on public.event_members for all
  to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

-- RLS: shuffle_state -------------------------------------------
alter table public.shuffle_state enable row level security;

create policy "view shuffle state for visible events"
  on public.shuffle_state for select
  to authenticated
  using (public.can_view_event(event_id));
-- mutations happen only inside SECURITY DEFINER shuffle RPCs
