alter table public.payment_orders
  add column if not exists checkout_attempt_id uuid,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_invoice_id text;

create unique index if not exists payment_orders_checkout_attempt_idx
on public.payment_orders (checkout_attempt_id)
where checkout_attempt_id is not null;

create index if not exists payment_orders_customer_idx
on public.payment_orders (stripe_customer_id)
where stripe_customer_id is not null;

create index if not exists payment_orders_invoice_idx
on public.payment_orders (stripe_invoice_id)
where stripe_invoice_id is not null;
