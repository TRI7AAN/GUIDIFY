-- Create table for storing user recommendations
create table if not exists user_recommendations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  query_type text not null, -- e.g., 'roadmap', 'college_list'
  result_data jsonb not null, -- Stores the full AI response
  created_at timestamptz default now()
);

-- RLS Policy to ensure users only see their own data
alter table user_recommendations enable row level security;

create policy "Users can view own data" on user_recommendations
  for select using (auth.uid() = user_id);

create policy "Users can insert own data" on user_recommendations
  for insert with check (auth.uid() = user_id);
