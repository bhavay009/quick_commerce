-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create ad_performance table
create table public.ad_performance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  sku_name text not null,
  date date not null,
  spend numeric not null default 0,
  impressions integer default 0,
  orders integer default 0,
  revenue numeric default 0,
  roas numeric generated always as (case when spend > 0 then revenue / spend else 0 end) stored,
  status text check (status in ('Push', 'Watch', 'Pause')) default 'Watch',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.ad_performance enable row level security;

-- Create policies
create policy "Users can view their own data"
  on public.ad_performance for select
  using (auth.uid() = user_id);

create policy "Users can insert their own data"
  on public.ad_performance for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own data"
  on public.ad_performance for update
  using (auth.uid() = user_id);

create policy "Users can delete their own data"
  on public.ad_performance for delete
  using (auth.uid() = user_id);
