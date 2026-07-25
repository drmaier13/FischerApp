create table if not exists public.trial_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answered_count integer not null default 0 check (answered_count between 0 and 100),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trial_usage enable row level security;

revoke all on table public.trial_usage from anon, authenticated;
grant select on table public.trial_usage to authenticated;

drop policy if exists "Users can read their own trial usage" on public.trial_usage;
create policy "Users can read their own trial usage"
on public.trial_usage
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.consume_trial_question()
returns table (
  is_allowed boolean,
  used_count integer,
  remaining_count integer,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_count integer := 0;
  existing_access public.user_access%rowtype;
begin
  if current_user_id is null then
    raise exception 'Bitte zuerst anmelden';
  end if;

  select *
  into existing_access
  from public.user_access
  where user_id = current_user_id;

  if found then
    if existing_access.expires_at > now() and existing_access.revoked_at is null then
      return query select true, 0, 100, 'active_access'::text;
    end if;

    select coalesce(answered_count, 0)
    into current_count
    from public.trial_usage
    where user_id = current_user_id;

    return query
    select false, coalesce(current_count, 0), 0, 'access_required'::text;
    return;
  end if;

  insert into public.trial_usage (user_id, answered_count, started_at, updated_at)
  values (current_user_id, 1, now(), now())
  on conflict (user_id) do update
  set answered_count = public.trial_usage.answered_count + 1,
      updated_at = now()
  where public.trial_usage.answered_count < 100
  returning answered_count into current_count;

  if current_count is null then
    select answered_count
    into current_count
    from public.trial_usage
    where user_id = current_user_id;

    return query
    select false, coalesce(current_count, 100), 0, 'trial_complete'::text;
    return;
  end if;

  return query
  select true, current_count, greatest(0, 100 - current_count), 'trial'::text;
end;
$$;

revoke all on function public.consume_trial_question() from public;
grant execute on function public.consume_trial_question() to authenticated;

drop policy if exists "Users can read their own learning state" on public.learning_states;
create policy "Users can read their own learning state"
on public.learning_states
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
        and user_access.expires_at > now()
        and user_access.revoked_at is null
    )
    or not exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can create their own learning state" on public.learning_states;
create policy "Users can create their own learning state"
on public.learning_states
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
        and user_access.expires_at > now()
        and user_access.revoked_at is null
    )
    or not exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can update their own learning state" on public.learning_states;
create policy "Users can update their own learning state"
on public.learning_states
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
        and user_access.expires_at > now()
        and user_access.revoked_at is null
    )
    or not exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
        and user_access.expires_at > now()
        and user_access.revoked_at is null
    )
    or not exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can delete their own learning state" on public.learning_states;
create policy "Users can delete their own learning state"
on public.learning_states
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
        and user_access.expires_at > now()
        and user_access.revoked_at is null
    )
    or not exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can read their own exam attempts" on public.exam_attempts;
create policy "Users can read their own exam attempts"
on public.exam_attempts
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
        and user_access.expires_at > now()
        and user_access.revoked_at is null
    )
    or not exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can create their own exam attempts" on public.exam_attempts;
create policy "Users can create their own exam attempts"
on public.exam_attempts
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
        and user_access.expires_at > now()
        and user_access.revoked_at is null
    )
    or not exists (
      select 1
      from public.user_access
      where user_access.user_id = (select auth.uid())
    )
  )
);
