CREATE TABLE IF NOT EXISTS ncvet_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    nsqf_level INTEGER,
    skills TEXT[],
    duration TEXT,
    provider TEXT,
    url TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ncvet_nsqf_level ON ncvet_courses(nsqf_level);
