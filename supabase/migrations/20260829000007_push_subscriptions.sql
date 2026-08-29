-- Web Push subscriptions ----------------------------------------------
create table public.push_subscriptions (
  id           uuid primary key default extensions.gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "users manage their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- RPC: upsert the current device's subscription --------------------
create or replace function public.save_push_subscription(
  _endpoint text, _p256dh text, _auth text, _user_agent text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), _endpoint, _p256dh, _auth, _user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_seen_at = now();
$$;

grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.delete_push_subscription(_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions
  where endpoint = _endpoint and user_id = (select auth.uid());
$$;

grant execute on function public.delete_push_subscription(text) to authenticated;
