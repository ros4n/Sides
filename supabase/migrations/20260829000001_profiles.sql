-- Extensions -----------------------------------------------------------------
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Profiles ------------------------------------------------------------------
-- One row per auth user. `username` is the public handle used to find and add
-- friends; `avatar_url` points at a public object in the `avatars` bucket.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     extensions.citext unique
               check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text check (display_name is null or char_length(display_name) between 1 and 50),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Public-facing identity for each auth user.';

-- Keep updated_at fresh ----------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row when an auth user is created -----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Any authenticated user can read any profile (needed for friend search and
-- to render names/avatars across the app).
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Avatar storage -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users manage their own avatar folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
