import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }) => {
  const { user, updateOnboardingStatus } = useAuth();

  // Local Form State
  const [profileData, setProfileData] = useState({
    name: '',
    age: '',
    gender: '',
    currentClass: '',
    location: '',
  });

  const [quizResponses, setQuizResponses] = useState([]);
  const [quizScores, setQuizScores] = useState(null);
  const [careerSuggestion, setCareerSuggestion] = useState('');

  // Flow State
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Start loading until we verify step
  const [error, setError] = useState(null);

  /**
   * Initialize Onboarding State
   * Fetches current step and form data from DB.
   */
  useEffect(() => {
    let mounted = true;

    const initOnboarding = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (mounted && data) {
          setProfileData({
            name: data.name || '',
            age: data.age || '',
            gender: data.gender || '',
            currentClass: data.current_class || '',
            location: data.location || '',
          });

          // Restore quiz state if exists
          if (data.category_scores) setQuizScores(data.category_scores);
          if (data.career_suggestion) setCareerSuggestion(data.career_suggestion);

          // Determine step:
          // If DB says completed, but we are in Onboarding flow, maybe redirect?
          // The Page component handles redirection. We just provide truth.
          if (data.onboarding_complete) {
            updateOnboardingStatus(true);
          } else {
            setCurrentStep(data.onboarding_step || 0);
          }
        }
      } catch (err) {
        console.error("Onboarding init error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initOnboarding();

    return () => { mounted = false; };
  }, [user]);

  /**
   * Save Step 1: Profile Info
   */
  const saveProfileData = async () => {
    try {
      setIsLoading(true);
      const updates = {
        user_id: user.id,
        name: profileData.name,
        age: profileData.age,
        gender: profileData.gender,
        current_class: profileData.currentClass,
        location: profileData.location,
        role: 'student',
        onboarding_step: 1, // Advance to next step
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      setCurrentStep(1);
      return true;
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save Step 2: Quiz Responses
   */
  const saveQuizResponses = async () => {
    try {
      setIsLoading(true);

      // 1. Save responses
      const { error: quizError } = await supabase
        .from('quiz_responses')
        .upsert(
          quizResponses.map(r => ({
            user_id: user.id,
            question_id: r.questionId,
            answer_id: r.answerId,
            created_at: new Date()
          }))
        );

      if (quizError) throw quizError;

      // 2. Update scores & step in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          category_scores: quizScores,
          onboarding_step: 2,
          updated_at: new Date()
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      setCurrentStep(2);
      return true;
    } catch (err) {
      console.error("Save quiz error:", err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save Step 3/4: Completion
   */
  const saveCareerSuggestion = async (suggestion) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          career_suggestion: suggestion,
          onboarding_complete: true,
          onboarding_step: 4,
          updated_at: new Date()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCareerSuggestion(suggestion);
      updateOnboardingStatus(true); // Notify AuthContext
      return true;
    } catch (err) {
      console.error("Save completion error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCategoryScores = (responses) => {
    const counts = { Analytical: 0, Creative: 0, Social: 0, Business: 0, Science: 0 };
    responses.forEach(r => {
      const raw = (r.answerId || '').toString().toLowerCase();
      // Simple mapping logic (can be expanded)
      if (raw.includes('tech') || raw.includes('science')) counts.Science++;
      else if (raw.includes('analy') || raw.includes('logic')) counts.Analytical++;
      else if (raw.includes('creat') || raw.includes('art')) counts.Creative++;
      else if (raw.includes('social') || raw.includes('help')) counts.Social++;
      else if (raw.includes('busin') || raw.includes('lead')) counts.Business++;
    });

    const total = responses.length || 1;
    const scores = {
      Analytical: Math.round((counts.Analytical / total) * 100),
      Creative: Math.round((counts.Creative / total) * 100),
      Social: Math.round((counts.Social / total) * 100),
      Business: Math.round((counts.Business / total) * 100),
      Science: Math.round((counts.Science / total) * 100),
    };
    setQuizScores(scores);
    return scores;
  };

  /**
   * Manual Navigation
   */
  const nextStep = async () => {
    const next = currentStep + 1;
    // Optimistic update
    setCurrentStep(next);
    // Background save of step
    try {
      await supabase.from('profiles').update({ onboarding_step: next }).eq('user_id', user.id);
    } catch (e) {
      console.warn("Failed to persist step:", e);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };


  const value = {
    profileData,
    setProfileData,
    quizResponses,
    setQuizResponses,
    quizScores,
    careerSuggestion,
    currentStep,
    isLoading,
    saveProfileData,
    saveQuizResponses,
    saveCareerSuggestion,
    calculateCategoryScores,
    nextStep,
    prevStep,
    error
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;