-- A user with a pending invite needs to see the event to decide on it.
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
        or exists (
          select 1 from public.event_invites i
          where i.event_id = _event and i.invitee_id = _user and i.status = 'pending'
        )
      )
  );
$$;

-- ------------------------------------------------------------------
-- Web Push dispatch: when a notification row is inserted, ping the
-- `send-push` Edge Function so it can deliver a background push.
--
-- Uses pg_net if available. The Edge Function URL is read from the
-- `app.settings.edge_base_url` GUC (falls back to the local gateway).
-- Failures never block the insert.
-- ------------------------------------------------------------------
create or replace function public.dispatch_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _base   text;
  _secret text;
begin
  begin
    _base := current_setting('app.settings.edge_base_url', true);
  exception when others then _base := null;
  end;
  _base := coalesce(nullif(_base, ''), 'http://kong:8000/functions/v1');

  begin
    _secret := current_setting('app.settings.service_role_key', true);
  exception when others then _secret := null;
  end;

  if to_regclass('net.http_post') is null and
     not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'net' and p.proname = 'http_post') then
    return new;
  end if;

  perform net.http_post(
    url     := _base || '/send-push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || coalesce(_secret, '')
               ),
    body    := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  raise notice 'push dispatch skipped: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_push_for_notification();
