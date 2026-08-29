-- Enable background HTTP + scheduling (available on Supabase local and hosted).
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Cleaner push-dispatch trigger now that pg_net is guaranteed.
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
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    return new;
  end if;

  begin _base := current_setting('app.settings.edge_base_url', true); exception when others then _base := null; end;
  _base := coalesce(nullif(_base, ''), 'http://kong:8000/functions/v1');

  begin _secret := current_setting('app.settings.service_role_key', true); exception when others then _secret := null; end;

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

-- Schedule "starting soon" reminders every 5 minutes (idempotent).
select cron.unschedule('event-reminders')
where exists (select 1 from cron.job where jobname = 'event-reminders');

select cron.schedule('event-reminders', '*/5 * * * *',
  $$ select public.send_due_event_reminders(); $$);
