-- Create table for NCVET verified courses
create table if not exists verified_courses (
  id uuid default gen_random_uuid() primary key,
  course_name text not null,
  nsqf_level int not null check (nsqf_level between 1 and 10),
  sector text not null,
  duration_hours int not null,
  certification_body text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table verified_courses enable row level security;

-- Drop existing policies to avoid errors on re-run
drop policy if exists "Allow read access for authenticated users" on verified_courses;
drop policy if exists "Allow read access for anon users" on verified_courses;
drop policy if exists "Allow insert for all" on verified_courses;

-- Create policy to allow read access for authenticated users
create policy "Allow read access for authenticated users"
  on verified_courses for select
  to authenticated
  using (true);

-- Create policy to allow read access for anon users (if needed for public pages)
create policy "Allow read access for anon users"
  on verified_courses for select
  to anon
  using (true);

-- Create policy to allow insert for all (needed for seeding)
create policy "Allow insert for all"
  on verified_courses for insert
  with check (true);
