-- AUTO-GENERATED from guidify-backend/data/*.json by scripts/seed_reference_data.py
-- verified_courses: NCVET/NSQF reference data.
-- RLS: public read. Writes are applied via the Supabase Management API or SQL
-- editor — no service-role key is used.

CREATE TABLE IF NOT EXISTS public.verified_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name TEXT NOT NULL UNIQUE,
    nsqf_level INTEGER NOT NULL,
    sector TEXT,
    certification_body TEXT,
    duration_hours INTEGER,
    min_eligibility TEXT,
    job_roles TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verified_courses_level ON public.verified_courses(nsqf_level);
CREATE INDEX IF NOT EXISTS idx_verified_courses_sector ON public.verified_courses(sector);

ALTER TABLE public.verified_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verified_courses_public_read" ON public.verified_courses;
CREATE POLICY "verified_courses_public_read"
    ON public.verified_courses FOR SELECT
    TO anon, authenticated
    USING (true);

INSERT INTO public.verified_courses
    (course_name, nsqf_level, sector, certification_body, duration_hours, min_eligibility, job_roles)
VALUES
    ('Solar PV Installer (Suryamitra)', 4, 'Green Jobs', 'SCGJ', 300, '10th Pass', ARRAY['Solar Installer', 'Site Technician']),
    ('Data Associate', 7, 'IT-ITeS', 'NASSCOM', 400, 'Graduate', ARRAY['Data Analyst', 'Junior Data Scientist']),
    ('Junior Software Developer', 5, 'IT-ITeS', 'NASSCOM', 400, '12th Pass / Diploma', ARRAY['Developer', 'Programmer']),
    ('Automotive Service Technician (Two and Three Wheelers)', 4, 'Automotive', 'ASDC', 350, '10th Pass', ARRAY['Service Technician', 'Mechanic']),
    ('General Duty Assistant', 4, 'Healthcare', 'HSSC', 400, '10th Pass', ARRAY['Nurse Assistant', 'Patient Caret']),
    ('Field Technician - Computing and Peripherals', 4, 'Electronics', 'ESSCI', 300, '12th Pass', ARRAY['Hardware Technician']),
    ('Retail Sales Associate', 4, 'Retail', 'RASCI', 280, '10th Pass', ARRAY['Sales Associate', 'Store Assistant']),
    ('Assistant Electrician', 3, 'Construction', 'CSDCI', 350, '10th Pass', ARRAY['Electrician Assistant']),
    ('Yoga Instructor (Bilingual)', 5, 'Beauty & Wellness', 'B&WSSC', 400, '12th Pass', ARRAY['Yoga Trainer']),
    ('Drone Service Technician', 4, 'Electronics', 'ESSCI', 300, '12th Pass / ITI', ARRAY['Drone Mechanic']),
    ('Organic Grower', 4, 'Agriculture', 'ASCI', 200, '5th Pass', ARRAY['Organic Farmer']),
    ('Cyber Security Analyst', 7, 'IT-ITeS', 'DSCI', 500, 'Graduate', ARRAY['Security Analyst']),
    ('AI - Data Quality Analyst', 5, 'IT-ITeS', 'NASSCOM', 400, 'Diploma / Graduate', ARRAY['Data Labeler', 'QA Analyst']),
    ('Cloud Computing - Junior Architect', 6, 'IT-ITeS', 'NASSCOM', 450, 'Graduate', ARRAY['Cloud Support']),
    ('Handset Repair Engineer (Level II)', 4, 'Telecom', 'TSSC', 340, '12th / ITI', ARRAY['Mobile Repair Tech']),
    ('Web Developer', 5, 'IT-ITeS', 'NIELIT', 500, NULL, NULL),
    ('IoT Technician', 4, 'Electronics', 'ESSCI', 350, NULL, NULL),
    ('Embedded Software Engineer', 6, 'Electronics', 'ESSCI', 600, NULL, NULL),
    ('Cloud Computing Professional', 6, 'IT-ITeS', 'NIELIT', 550, NULL, NULL),
    ('Data Scientist', 7, 'IT-ITeS', 'NASSCOM', 800, NULL, NULL),
    ('Machine Learning Engineer', 7, 'IT-ITeS', 'NASSCOM', 750, NULL, NULL),
    ('Blockchain Architect', 7, 'IT-ITeS', 'NASSCOM', 700, NULL, NULL),
    ('Solar Panel Installation Technician', 4, 'Green Jobs', 'SCGJ', 300, NULL, NULL),
    ('Robotics Automation Technician', 5, 'Electronics', 'ESSCI', 500, NULL, NULL),
    ('Full Stack Developer', 6, 'IT-ITeS', 'NASSCOM', 600, NULL, NULL),
    ('UI/UX Designer', 5, 'IT-ITeS', 'MESC', 450, NULL, NULL)
ON CONFLICT (course_name) DO NOTHING;
