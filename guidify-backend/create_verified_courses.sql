-- Create table for NCVET verified courses
CREATE TABLE IF NOT EXISTS public.verified_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name TEXT NOT NULL,
    nsqf_level INTEGER NOT NULL,
    sector TEXT,
    certification_body TEXT, -- e.g. NCVET, NSDC
    duration_hours INTEGER,
    min_eligibility TEXT,
    job_roles TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast recommendation lookups
CREATE INDEX IF NOT EXISTS idx_verified_courses_level ON verified_courses(nsqf_level);
CREATE INDEX IF NOT EXISTS idx_verified_courses_sector ON verified_courses(sector);

-- RLS Policies (Public Read, Admin Write)
ALTER TABLE public.verified_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view verified courses" 
ON public.verified_courses FOR SELECT 
TO public 
USING (true);

-- Assuming only service_role (admin) can insert/update
-- No policy needed for service_role as it bypasses RLS
