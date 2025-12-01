alter table profiles 
add column if not exists personality_analysis jsonb;

NOTIFY pgrst, 'reload config';
