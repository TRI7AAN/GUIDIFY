alter table profiles 
add column if not exists login_streak int default 0,
add column if not exists last_login timestamptz,
add column if not exists activity_log jsonb default '[]'::jsonb, -- Stores dates of activity for Heatmap
add column if not exists career_roadmap jsonb, -- Stores the Full 5-Year AI Plan
add column if not exists current_tier text default 'Novice',
add column if not exists career_readiness_score int default 0;
