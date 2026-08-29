-- Treat everyone who isn't a "watcher" as being on the team sheet, so the
-- organiser (admin) also gets shuffled onto a team by default.

create or replace function public.sync_member_board()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.role = 'watcher' then
      delete from public.team_assignments
      where event_id = new.event_id and user_id = new.user_id;
    else
      insert into public.team_assignments (event_id, user_id)
      values (new.event_id, new.user_id)
      on conflict (event_id, user_id) do nothing;
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Backfill: give existing admins/players a pool slot where missing.
insert into public.team_assignments (event_id, user_id)
select m.event_id, m.user_id
from public.event_members m
where m.role <> 'watcher'
  and not exists (
    select 1 from public.team_assignments t
    where t.event_id = m.event_id and t.user_id = m.user_id
  );
