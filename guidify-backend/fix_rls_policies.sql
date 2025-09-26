-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_assessments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Quiz Responses Policies
CREATE POLICY "Users can view own responses" 
ON quiz_responses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses" 
ON quiz_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Personality Profiles Policies
CREATE POLICY "Users can view own personality profile" 
ON personality_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own personality profile" 
ON personality_profiles FOR ALL 
USING (auth.uid() = user_id);

-- Personality Assessments Policies
CREATE POLICY "Users can view own assessments" 
ON personality_assessments FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own assessments" 
ON personality_assessments FOR ALL 
USING (auth.uid() = user_id);
