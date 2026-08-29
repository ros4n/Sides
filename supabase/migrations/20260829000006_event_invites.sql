-- Event invites --------------------------------------------------------
create table public.event_invites (
  id           uuid primary key default extensions.gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  inviter_id   uuid not null references auth.users (id) on delete cascade,
  invitee_id   uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'player' check (role in ('player', 'watcher')),
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

-- Only one live invite per (event, invitee).
create unique index event_invites_pending_uniq
  on public.event_invites (event_id, invitee_id)
  where status = 'pending';
create index event_invites_invitee_idx on public.event_invites (invitee_id) where status = 'pending';

alter table public.event_invites enable row level security;

create policy "invites visible to inviter, invitee and event admins"
  on public.event_invites for select
  to authenticated
  using (
    invitee_id = (select auth.uid())
    or inviter_id = (select auth.uid())
    or public.is_event_admin(event_id)
  );

-- RPC: create an invite ---------------------------------------------
create or replace function public.invite_to_event(_event uuid, _invitee uuid, _role text default 'player')
returns public.event_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me  uuid := (select auth.uid());
  _row public.event_invites;
begin
  if not public.can_invite_to_event(_event, _me) then
    raise exception 'you cannot invite people to this event';
  end if;
  if _role not in ('player', 'watcher') then raise exception 'invalid role'; end if;
  if public.is_event_member(_event, _invitee) then
    raise exception 'that user is already in the event';
  end if;

  insert into public.event_invites (event_id, inviter_id, invitee_id, role)
  values (_event, _me, _invitee, _role)
  on conflict (event_id, invitee_id) where (status = 'pending')
    do update set role = excluded.role, inviter_id = _me, created_at = now()
  returning * into _row;

  insert into public.notifications (user_id, actor_id, type, event_id, title, body, data)
  values (_invitee, _me, 'event_invite', _event,
          'Futsal invite',
          (select title from public.events where id = _event),
          jsonb_build_object('invite_id', _row.id, 'role', _role));

  return _row;
end;
$$;

grant execute on function public.invite_to_event(uuid, uuid, text) to authenticated;

-- RPC: respond to an invite (accept => become a member) ------------
create or replace function public.respond_event_invite(_invite uuid, _accept boolean)
returns public.event_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me  uuid := (select auth.uid());
  _row public.event_invites;
begin
  select * into _row from public.event_invites where id = _invite for update;
  if not found then raise exception 'invite not found'; end if;
  if _row.invitee_id <> _me then raise exception 'not your invite'; end if;
  if _row.status <> 'pending' then raise exception 'invite already handled'; end if;

  update public.event_invites
  set status = case when _accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = _invite
  returning * into _row;

  if _accept then
    insert into public.event_members (event_id, user_id, role)
    values (_row.event_id, _me, _row.role)
    on conflict (event_id, user_id) do nothing;

    -- let the inviter know
    insert into public.notifications (user_id, actor_id, type, event_id, title, body)
    values (_row.inviter_id, _me, 'event_added', _row.event_id,
            'Invite accepted',
            (select coalesce(display_name, username::text, 'Someone') from public.profiles where id = _me));
  end if;

  return _row;
end;
$$;

grant execute on function public.respond_event_invite(uuid, boolean) to authenticated;

-- RPC: revoke a pending invite (inviter or admin) -----------------
create or replace function public.revoke_event_invite(_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me  uuid := (select auth.uid());
  _row public.event_invites;
begin
  select * into _row from public.event_invites where id = _invite;
  if not found then return; end if;
  if _row.inviter_id <> _me and not public.is_event_admin(_row.event_id, _me) then
    raise exception 'not allowed';
  end if;
  update public.event_invites set status = 'revoked', responded_at = now()
  where id = _invite and status = 'pending';
end;
$$;

grant execute on function public.revoke_event_invite(uuid) to authenticated;
