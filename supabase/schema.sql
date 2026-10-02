create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  email text not null,
  full_name text not null,
  address text not null,
  items jsonb not null,
  total numeric(10,2) not null,
  status text not null default 'pending_payment',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "users insert own orders" on public.orders for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending_payment');
create policy "users read own orders" on public.orders for select to authenticated
  using (auth.uid() = user_id);
