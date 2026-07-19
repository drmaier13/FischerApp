create table if not exists public.learning_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  learning_state jsonb not null default '{"progress":{},"favorites":[],"streak":{"date":null,"days":0}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.learning_states enable row level security;

revoke all on table public.learning_states from anon;
grant select, insert, update, delete on table public.learning_states to authenticated;

drop policy if exists "Users can read their own learning state" on public.learning_states;
create policy "Users can read their own learning state"
on public.learning_states
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own learning state" on public.learning_states;
create policy "Users can create their own learning state"
on public.learning_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own learning state" on public.learning_states;
create policy "Users can update their own learning state"
on public.learning_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own learning state" on public.learning_states;
create policy "Users can delete their own learning state"
on public.learning_states
for delete
to authenticated
using ((select auth.uid()) = user_id);
