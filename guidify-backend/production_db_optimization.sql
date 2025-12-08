-- PRODUCTION DATABASE OPTIMIZATION SCRIPT
-- Features: 
-- 1. Idempotent RLS Policies (Security)
-- 2. Performance Indexes (Speed)
-- 3. Query Optimization (Analyze)

-- ==========================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. PERFORMANCE INDEXES (CRITICAL FOR SCALE)
-- ==========================================
-- Indexes for Foreign Keys and frequent filters
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_personality_profiles_user_id ON personality_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_personality_assessments_user_id ON personality_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);

-- Indexes for Joins
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_id ON assessment_responses(assessment_id);

-- ==========================================
-- 3. CLEAN & SECURE RLS POLICIES
-- ==========================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- Drop legacy naming variations
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- --- QUIZ RESPONSES ---
DROP POLICY IF EXISTS "Users can view own responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can insert own responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can update own responses" ON quiz_responses;

CREATE POLICY "Users can view own responses" ON quiz_responses FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own responses" ON quiz_responses FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own responses" ON quiz_responses FOR UPDATE USING ((select auth.uid()) = user_id);

-- --- PERSONALITY ASSESSMENTS ---
DROP POLICY IF EXISTS "Users can view own assessments" ON personality_assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON personality_assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON personality_assessments;

CREATE POLICY "Users can view own assessments" ON personality_assessments FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own assessments" ON personality_assessments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own assessments" ON personality_assessments FOR UPDATE USING ((select auth.uid()) = user_id);

-- --- USER RECOMMENDATIONS ---
DROP POLICY IF EXISTS "Users can view own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON user_recommendations;

CREATE POLICY "Users can view own recommendations" ON user_recommendations FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own recommendations" ON user_recommendations FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- ==========================================
-- 4. OPTIMIZATION
-- ==========================================
ANALYZE profiles;
ANALYZE quiz_responses;
ANALYZE personality_assessments;
