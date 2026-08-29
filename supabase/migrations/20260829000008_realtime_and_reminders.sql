-- Realtime -----------------------------------------------------------
-- Broadcast row changes on these tables to subscribed clients. RLS still
-- applies to realtime, so users only receive rows they are allowed to see.
alter publication supabase_realtime add table public.team_assignments;
alter publication supabase_realtime add table public.shuffle_state;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.event_members;
alter publication supabase_realtime add table public.event_invites;
alter publication supabase_realtime add table public.events;

-- Reminders --------------------------------------------------------
-- Track that a "starting soon" reminder has gone out for an event.
alter table public.events
  add column reminded_at timestamptz;

-- Insert reminder notifications for events starting within the window that
-- have not been reminded yet. Meant to be called on a schedule (pg_cron or
-- an external cron hitting an Edge Function). Returns how many events fired.
create or replace function public.send_due_event_reminders(_within interval default interval '30 minutes')
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  _count int := 0;
  _e     record;
begin
  for _e in
    select id, title, starts_at
    from public.events
    where status in ('scheduled', 'live')
      and reminded_at is null
      and starts_at between now() and now() + _within
    for update skip locked
  loop
    insert into public.notifications (user_id, type, event_id, title, body, data)
    select m.user_id, 'event_reminder', _e.id,
           'Futsal starting soon', _e.title,
           jsonb_build_object('starts_at', _e.starts_at)
    from public.event_members m
    where m.event_id = _e.id;

    update public.events set reminded_at = now() where id = _e.id;
    _count := _count + 1;
  end loop;
  return _count;
end;
$$;

grant execute on function public.send_due_event_reminders(interval) to service_role;

-- Optional: schedule it with pg_cron if the extension is available.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'event-reminders',
      '*/5 * * * *',
      $cron$ select public.send_due_event_reminders(); $cron$
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end;
$$;
