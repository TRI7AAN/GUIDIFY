-- Comprehensive fix for profiles table schema
-- This script ensures ALL required columns exist.

-- 1. Ensure table exists
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text,
  name text,
  role text default 'student',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Add ALL missing columns (idempotent)
do $$
begin
  -- Basic Info
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'email') then
    alter table public.profiles add column email text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'name') then
    alter table public.profiles add column name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'role') then
    alter table public.profiles add column role text default 'student';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'onboarding_complete') then
    alter table public.profiles add column onboarding_complete boolean default false;
  end if;

  -- Extended Profile Info (The missing ones)
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'age') then
    alter table public.profiles add column age integer;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'gender') then
    alter table public.profiles add column gender text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'current_class') then
    alter table public.profiles add column current_class text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'location') then
    alter table public.profiles add column location text;
  end if;

  -- AI & Quiz Data
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'category_scores') then
    alter table public.profiles add column category_scores jsonb;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'career_suggestion') then
    alter table public.profiles add column career_suggestion text;
  end if;

end $$;

-- 3. Fix existing null roles
update public.profiles set role = 'student' where role is null;

-- 4. Ensure role has default
alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role set default 'student';

-- 5. Enable RLS
alter table public.profiles enable row level security;

-- 6. Reset Policies (Drop and Recreate to be safe)
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own profile"
  on profiles for update
  using ( auth.uid() = user_id );

-- 7. Trigger (Updated to handle new columns if needed, but basic insert is fine)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'student')
  on conflict (user_id) do update
  set email = excluded.email, name = excluded.name;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
