-- Create quiz_responses table
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id text NOT NULL,
  answer_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can insert their own quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can update their own quiz responses" ON quiz_responses;

CREATE POLICY "Users can view their own quiz responses"
  ON quiz_responses FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own quiz responses"
  ON quiz_responses FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own quiz responses"
  ON quiz_responses FOR UPDATE
  USING ( auth.uid() = user_id );

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
