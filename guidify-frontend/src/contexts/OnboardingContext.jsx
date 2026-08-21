import React, { createContext, useContext, useState, useEffect } from 'react';
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
    // Career Goals — added for roadmap generation (schema.md §1-2)
    targetRole: '',
    skills: [],
    interests: [],
    learningHours: '5',
    // DPDP consent (rules.md §7)
    consentDataProcessing: false,
    consentAiTraining: false,
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
          .from('learners')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (mounted && data) {
          setProfileData({
            name: data.full_name || '',
            age: data.age || '',
            gender: data.gender || '',
            currentClass: data.current_class || '',
            location: data.location || '',
            targetRole: data.target_role || '',
            skills: data.skills || [],
            interests: data.interests || [],
            learningHours: data.learning_hours || '5',
            consentDataProcessing: data.consent_data_processing || false,
            consentAiTraining: data.consent_ai_training || false,
          });

          // Restore quiz state if exists
          if (data.category_scores) setQuizScores(data.category_scores);
          if (data.career_suggestion) setCareerSuggestion(data.career_suggestion);

          // Determine step:
          if (data.onboarding_completed) {
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
  }, [user, updateOnboardingStatus]);

  /**
   * Save Step 1: Profile Info
   */
  const saveProfileData = async () => {
    try {
      setIsLoading(true);
      const updates = {
        full_name: profileData.name,
        age: profileData.age ? Number(profileData.age) : null,
        gender: profileData.gender || null,
        current_class: profileData.currentClass || null,
        location: profileData.location || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('learners')
        .update(updates)
        .eq('id', user.id);

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
        .from('learners')
        .update({
          category_scores: quizScores,
          updated_at: new Date()
        })
        .eq('id', user.id);

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
        .from('learners')
        .update({
          career_suggestion: suggestion,
          onboarding_completed: true,
          updated_at: new Date()
        })
        .eq('id', user.id);

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
      await supabase.from('learners').update({ onboarding_step: next }).eq('id', user.id);
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
    error,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;
