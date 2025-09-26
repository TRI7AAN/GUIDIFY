-- Psychometric Test Schema

-- 1. Personality Assessments Table (Tracks the session)
CREATE TABLE IF NOT EXISTS public.personality_assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'in_progress', -- 'in_progress', 'completed'
  current_question_index integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 2. Assessment Responses Table (Stores Q&A pairs)
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid REFERENCES public.personality_assessments(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL, -- 'multiple_choice', 'scale', 'open_ended'
  options jsonb, -- Array of options if multiple choice
  user_answer text,
  ai_analysis jsonb, -- Gemini's analysis of this specific answer
  created_at timestamptz DEFAULT now()
);

-- 3. Personality Profiles Table (Stores the final report)
CREATE TABLE IF NOT EXISTS public.personality_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  assessment_id uuid REFERENCES public.personality_assessments(id),
  ocean_scores jsonb, -- { openness: 85, conscientiousness: 70... }
  grit_score integer,
  traits jsonb, -- Detailed trait analysis
  career_matches jsonb, -- AI suggested careers
  development_plan jsonb, -- Actionable steps
  raw_analysis text, -- Full text from Gemini
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own assessments" ON public.personality_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.personality_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assessments" ON public.personality_assessments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own responses" ON public.assessment_responses FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.personality_assessments WHERE id = assessment_id));
CREATE POLICY "Users can insert own responses" ON public.assessment_responses FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.personality_assessments WHERE id = assessment_id));

CREATE POLICY "Users can view own profile" ON public.personality_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.personality_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.personality_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Refresh cache
NOTIFY pgrst, 'reload config';
