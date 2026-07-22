create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_access_valid_period check (expires_at > starts_at)
);

alter table public.user_access enable row level security;

revoke all on table public.user_access from anon;
revoke insert, update, delete on table public.user_access from authenticated;
grant select on table public.user_access to authenticated;

drop policy if exists "Users can read their own access period" on public.user_access;
create policy "Users can read their own access period"
on public.user_access
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.create_or_activate_user_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_start timestamptz;
begin
  access_start := coalesce(new.email_confirmed_at, new.created_at, now());

  if tg_op = 'INSERT' then
    insert into public.user_access (user_id, starts_at, expires_at)
    values (new.id, access_start, access_start + interval '1 year')
    on conflict (user_id) do nothing;
  elsif old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.user_access
    set starts_at = new.email_confirmed_at,
        expires_at = new.email_confirmed_at + interval '1 year',
        updated_at = now()
    where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists create_user_access_on_signup on auth.users;
create trigger create_user_access_on_signup
after insert on auth.users
for each row execute function public.create_or_activate_user_access();

drop trigger if exists activate_user_access_on_confirmation on auth.users;
create trigger activate_user_access_on_confirmation
after update of email_confirmed_at on auth.users
for each row execute function public.create_or_activate_user_access();

insert into public.user_access (user_id, starts_at, expires_at)
select
  id,
  coalesce(email_confirmed_at, created_at, now()),
  coalesce(email_confirmed_at, created_at, now()) + interval '1 year'
from auth.users
on conflict (user_id) do nothing;

drop policy if exists "Users can read their own learning state" on public.learning_states;
create policy "Users can read their own learning state"
on public.learning_states
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
  )
);

drop policy if exists "Users can create their own learning state" on public.learning_states;
create policy "Users can create their own learning state"
on public.learning_states
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
  )
);

drop policy if exists "Users can update their own learning state" on public.learning_states;
create policy "Users can update their own learning state"
on public.learning_states
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
  )
);

drop policy if exists "Users can delete their own learning state" on public.learning_states;
create policy "Users can delete their own learning state"
on public.learning_states
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
  )
);

