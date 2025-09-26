-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
-- Drop potential existing policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create optimized policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

-- 2. QUIZ RESPONSES
DROP POLICY IF EXISTS "Users can view own responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can insert own responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can view their own quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can insert their own quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can update their own quiz responses" ON quiz_responses;

CREATE POLICY "Users can view own responses" 
ON quiz_responses FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own responses" 
ON quiz_responses FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own responses" 
ON quiz_responses FOR UPDATE
USING ((select auth.uid()) = user_id);

-- 3. PERSONALITY PROFILES
DROP POLICY IF EXISTS "Users can view own personality profile" ON personality_profiles;
DROP POLICY IF EXISTS "Users can insert/update own personality profile" ON personality_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON personality_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON personality_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON personality_profiles;

CREATE POLICY "Users can view own personality profile" 
ON personality_profiles FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own personality profile" 
ON personality_profiles FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own personality profile" 
ON personality_profiles FOR UPDATE
USING ((select auth.uid()) = user_id);

-- 4. PERSONALITY ASSESSMENTS
DROP POLICY IF EXISTS "Users can view own assessments" ON personality_assessments;
DROP POLICY IF EXISTS "Users can insert/update own assessments" ON personality_assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON personality_assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON personality_assessments;

CREATE POLICY "Users can view own assessments" 
ON personality_assessments FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own assessments" 
ON personality_assessments FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own assessments" 
ON personality_assessments FOR UPDATE
USING ((select auth.uid()) = user_id);

-- 5. ASSESSMENT RESPONSES
DROP POLICY IF EXISTS "Users can view own responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can insert own responses" ON assessment_responses;

CREATE POLICY "Users can view own responses" 
ON assessment_responses FOR SELECT 
USING ((select auth.uid()) = (SELECT user_id FROM personality_assessments WHERE id = assessment_id));

CREATE POLICY "Users can insert own responses" 
ON assessment_responses FOR INSERT
WITH CHECK ((select auth.uid()) = (SELECT user_id FROM personality_assessments WHERE id = assessment_id));

-- 6. USER RECOMMENDATIONS
DROP POLICY IF EXISTS "Users can view own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can view own data" ON user_recommendations;
DROP POLICY IF EXISTS "Users can insert own data" ON user_recommendations;

CREATE POLICY "Users can view own recommendations" 
ON user_recommendations FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own recommendations" 
ON user_recommendations FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);
