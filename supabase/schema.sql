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

alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_reference text;

create table if not exists public.products (
  id text primary key,
  name text not null,
  price numeric(10,2) not null
);
alter table public.products enable row level security;
create policy "products readable" on public.products for select using (true);
insert into public.products (id, name, price) values
  ('cap-classic','Classic Cap',15),('cap-snap','Snapback Cap',18),
  ('sweat-hood','Hooded Sweatshirt',45),('sweat-crew','Crewneck Sweatshirt',38),
  ('knit-top','Knitted Top',32),('knit-cardi','Knitted Cardigan',52)
on conflict (id) do nothing;
