create extension if not exists pgcrypto;

alter table public.user_access
  add column if not exists access_type text not null default 'legacy',
  add column if not exists source_reference text,
  add column if not exists granted_by text,
  add column if not exists note text,
  add column if not exists revoked_at timestamptz;

alter table public.user_access
  drop constraint if exists user_access_type_check;

alter table public.user_access
  add constraint user_access_type_check
  check (access_type in ('legacy', 'paid', 'complimentary', 'code'));

drop trigger if exists create_user_access_on_signup on auth.users;
drop trigger if exists activate_user_access_on_confirmation on auth.users;
drop function if exists public.create_or_activate_user_access();

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_type text not null check (access_type in ('legacy', 'paid', 'complimentary', 'code')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  duration_days integer not null check (duration_days between 1 and 3660),
  source_reference text,
  granted_by text,
  note text,
  created_at timestamptz not null default now(),
  constraint access_grants_valid_period check (expires_at > starts_at)
);

create unique index if not exists access_grants_source_reference_idx
on public.access_grants (access_type, source_reference)
where source_reference is not null;

create index if not exists access_grants_user_created_idx
on public.access_grants (user_id, created_at desc);

insert into public.access_grants (
  user_id,
  access_type,
  starts_at,
  expires_at,
  duration_days,
  source_reference,
  granted_by,
  note
)
select
  user_id,
  'legacy',
  starts_at,
  expires_at,
  greatest(1, ceil(extract(epoch from (expires_at - starts_at)) / 86400.0)::integer),
  'legacy:' || user_id::text,
  'migration',
  'Bestehender Zugang vor Einführung des Verkaufssystems'
from public.user_access
on conflict (access_type, source_reference) where source_reference is not null do nothing;

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null,
  duration_days integer not null default 365 check (duration_days between 1 and 3660),
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_by text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_codes_valid_window check (
    valid_from is null or valid_until is null or valid_until > valid_from
  )
);

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  granted_until timestamptz not null,
  unique (code_id, user_id)
);

create index if not exists access_code_redemptions_user_idx
on public.access_code_redemptions (user_id, redeemed_at desc);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  payment_status text not null,
  consent_terms_version text,
  consent_accepted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_user_created_idx
on public.payment_orders (user_id, created_at desc);

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.access_grants enable row level security;
alter table public.access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;
alter table public.payment_orders enable row level security;
alter table public.stripe_webhook_events enable row level security;

revoke all on table public.access_grants from anon, authenticated;
revoke all on table public.access_codes from anon, authenticated;
revoke all on table public.access_code_redemptions from anon, authenticated;
revoke all on table public.payment_orders from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;

grant select on table public.access_grants to authenticated;
grant select on table public.access_code_redemptions to authenticated;
grant select on table public.payment_orders to authenticated;

drop policy if exists "Users can read their own access grants" on public.access_grants;
create policy "Users can read their own access grants"
on public.access_grants
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own code redemptions" on public.access_code_redemptions;
create policy "Users can read their own code redemptions"
on public.access_code_redemptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own payment orders" on public.payment_orders;
create policy "Users can read their own payment orders"
on public.payment_orders
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.grant_user_access(
  p_user_id uuid,
  p_duration_days integer,
  p_access_type text,
  p_source_reference text default null,
  p_granted_by text default null,
  p_note text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_access public.user_access%rowtype;
  existing_grant public.access_grants%rowtype;
  grant_start timestamptz;
  grant_end timestamptz;
begin
  if p_duration_days < 1 or p_duration_days > 3660 then
    raise exception 'Ungültige Freischaltdauer';
  end if;

  if p_access_type not in ('legacy', 'paid', 'complimentary', 'code') then
    raise exception 'Ungültige Zugangsart';
  end if;

  if p_source_reference is not null then
    select *
    into existing_grant
    from public.access_grants
    where access_type = p_access_type
      and source_reference = p_source_reference;

    if found then
      return existing_grant.expires_at;
    end if;
  end if;

  select *
  into current_access
  from public.user_access
  where user_id = p_user_id
  for update;

  grant_start := greatest(
    now(),
    case
      when found and current_access.revoked_at is null then current_access.expires_at
      else now()
    end
  );
  grant_end := grant_start + make_interval(days => p_duration_days);

  insert into public.access_grants (
    user_id,
    access_type,
    starts_at,
    expires_at,
    duration_days,
    source_reference,
    granted_by,
    note
  )
  values (
    p_user_id,
    p_access_type,
    grant_start,
    grant_end,
    p_duration_days,
    p_source_reference,
    p_granted_by,
    p_note
  );

  insert into public.user_access (
    user_id,
    starts_at,
    expires_at,
    access_type,
    source_reference,
    granted_by,
    note,
    revoked_at,
    updated_at
  )
  values (
    p_user_id,
    now(),
    grant_end,
    p_access_type,
    p_source_reference,
    p_granted_by,
    p_note,
    null,
    now()
  )
  on conflict (user_id) do update
  set
    starts_at = least(public.user_access.starts_at, now()),
    expires_at = excluded.expires_at,
    access_type = excluded.access_type,
    source_reference = excluded.source_reference,
    granted_by = excluded.granted_by,
    note = excluded.note,
    revoked_at = null,
    updated_at = now();

  return grant_end;
end;
$$;

revoke all on function public.grant_user_access(uuid, integer, text, text, text, text) from public;
grant execute on function public.grant_user_access(uuid, integer, text, text, text, text) to service_role;

create or replace function public.redeem_access_code(p_code text)
returns table (expires_at timestamptz, access_type text, label text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text;
  selected_code public.access_codes%rowtype;
  new_expiry timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Bitte zuerst anmelden';
  end if;

  normalized_code := upper(trim(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g')));

  if length(normalized_code) < 6 then
    raise exception 'Der Freischaltcode ist ungültig';
  end if;

  select *
  into selected_code
  from public.access_codes
  where code_hash = encode(digest(normalized_code, 'sha256'), 'hex')
  for update;

  if not found
    or not selected_code.is_active
    or (selected_code.valid_from is not null and selected_code.valid_from > now())
    or (selected_code.valid_until is not null and selected_code.valid_until <= now())
    or selected_code.redemption_count >= selected_code.max_redemptions then
    raise exception 'Der Freischaltcode ist ungültig oder nicht mehr verfügbar';
  end if;

  if exists (
    select 1
    from public.access_code_redemptions
    where code_id = selected_code.id
      and user_id = (select auth.uid())
  ) then
    raise exception 'Dieser Freischaltcode wurde für dein Konto bereits verwendet';
  end if;

  new_expiry := public.grant_user_access(
    (select auth.uid()),
    selected_code.duration_days,
    'code',
    'code:' || selected_code.id::text || ':' || (select auth.uid())::text,
    'access-code',
    selected_code.label
  );

  insert into public.access_code_redemptions (code_id, user_id, granted_until)
  values (selected_code.id, (select auth.uid()), new_expiry);

  update public.access_codes
  set redemption_count = redemption_count + 1,
      updated_at = now()
  where id = selected_code.id;

  return query
  select new_expiry, 'code'::text, selected_code.label;
end;
$$;

revoke all on function public.redeem_access_code(text) from public;
grant execute on function public.redeem_access_code(text) to authenticated;

drop policy if exists "Users can read their own access period" on public.user_access;
create policy "Users can read their own access period"
on public.user_access
for select
to authenticated
using ((select auth.uid()) = user_id);

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
      and user_access.revoked_at is null
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
      and user_access.revoked_at is null
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
      and user_access.revoked_at is null
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
      and user_access.revoked_at is null
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
      and user_access.revoked_at is null
  )
);

drop policy if exists "Users can read their own exam attempts" on public.exam_attempts;
create policy "Users can read their own exam attempts"
on public.exam_attempts
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
      and user_access.revoked_at is null
  )
);

drop policy if exists "Users can create their own exam attempts" on public.exam_attempts;
create policy "Users can create their own exam attempts"
on public.exam_attempts
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_access
    where user_access.user_id = (select auth.uid())
      and user_access.expires_at > now()
      and user_access.revoked_at is null
  )
);
