-- Friendships --------------------------------------------------------------
-- A single row per pair of users, with the pair stored in a canonical order
-- (user_low < user_high) so the unique constraint dedupes regardless of who
-- sent the request. `requested_by` records direction.
create table public.friendships (
  id           uuid primary key default extensions.gen_random_uuid(),
  user_low     uuid not null references auth.users (id) on delete cascade,
  user_high    uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'blocked')),
  blocked_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint friendships_ordered check (user_low < user_high),
  constraint friendships_distinct check (user_low <> user_high),
  unique (user_low, user_high)
);

create index friendships_user_low_idx  on public.friendships (user_low);
create index friendships_user_high_idx on public.friendships (user_high);

create trigger friendships_touch_updated_at
  before update on public.friendships
  for each row execute function public.touch_updated_at();

-- Helper: are these two users accepted friends? --------------------------
create or replace function public.are_friends(_a uuid, _b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.user_low  = least(_a, _b)
      and f.user_high = greatest(_a, _b)
      and f.status = 'accepted'
  );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- RPC: send a friend request ------------------------------------------
create or replace function public.send_friend_request(_to uuid)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me   uuid := (select auth.uid());
  _low  uuid := least(_me, _to);
  _high uuid := greatest(_me, _to);
  _row  public.friendships;
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if _me = _to then raise exception 'cannot befriend yourself'; end if;

  insert into public.friendships (user_low, user_high, requested_by, status)
  values (_low, _high, _me, 'pending')
  on conflict (user_low, user_high) do update
    set status       = case
                         when public.friendships.status = 'blocked' then public.friendships.status
                         else 'pending'
                       end,
        requested_by = case
                         when public.friendships.status = 'blocked' then public.friendships.requested_by
                         else _me
                       end,
        updated_at   = now()
  returning * into _row;

  return _row;
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

-- RPC: respond to a friend request (accept / decline) ------------------
create or replace function public.respond_friend_request(_friendship uuid, _accept boolean)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me  uuid := (select auth.uid());
  _row public.friendships;
begin
  select * into _row from public.friendships where id = _friendship for update;
  if not found then raise exception 'friend request not found'; end if;
  if _me not in (_row.user_low, _row.user_high) then
    raise exception 'not your friend request';
  end if;
  if _row.status <> 'pending' then raise exception 'request is not pending'; end if;
  if _row.requested_by = _me then raise exception 'cannot respond to your own request'; end if;

  if _accept then
    update public.friendships set status = 'accepted', updated_at = now()
    where id = _friendship returning * into _row;
  else
    delete from public.friendships where id = _friendship;
    _row.status := 'declined';
  end if;

  return _row;
end;
$$;

grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- RPC: block / unblock a user ---------------------------------------
create or replace function public.set_friendship_block(_other uuid, _block boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me   uuid := (select auth.uid());
  _low  uuid := least(_me, _other);
  _high uuid := greatest(_me, _other);
begin
  if _me is null then raise exception 'not authenticated'; end if;

  if _block then
    insert into public.friendships (user_low, user_high, requested_by, status, blocked_by)
    values (_low, _high, _me, 'blocked', _me)
    on conflict (user_low, user_high) do update
      set status = 'blocked', blocked_by = _me, updated_at = now();
  else
    delete from public.friendships
    where user_low = _low and user_high = _high
      and status = 'blocked' and blocked_by = _me;
  end if;
end;
$$;

grant execute on function public.set_friendship_block(uuid, boolean) to authenticated;

-- RLS ----------------------------------------------------------------
alter table public.friendships enable row level security;

create policy "users see their own friendships"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (user_low, user_high));

-- Removing a friend / cancelling an outgoing request.
create policy "users can delete their own friendships"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (user_low, user_high));

-- All inserts/updates go through the SECURITY DEFINER RPCs above.
