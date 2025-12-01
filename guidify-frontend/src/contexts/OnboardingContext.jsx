import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }) => {
  const { user, updateOnboardingStatus } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    age: '',
    gender: '',
    currentClass: '',
    location: '',
  });

  const [quizResponses, setQuizResponses] = useState([]);
  const [quizScores, setQuizScores] = useState({
    Analytical: 0,
    Creative: 0,
    Social: 0,
    Business: 0,
    Science: 0,
  });

  const [careerSuggestion, setCareerSuggestion] = useState('');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastCheckTimestampRef = React.useRef(0);

  // Memoized function to check onboarding status with timeout and retry logic
  const checkOnboardingStatus = useCallback(async (forceRefresh = false) => {
    // Prevent excessive calls - only check once every 5 seconds unless forced
    const now = Date.now();
    if (!forceRefresh && now - lastCheckTimestampRef.current < 5000) {
      return;
    }

    // Reset error state
    setError(null);

    try {
      if (!user || !user.id) {
        return;
      }

      setIsLoading(true);
      lastCheckTimestampRef.current = now;

      // Fetch profile with retry logic
      let profileData = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (!profileData && retryCount < maxRetries) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // No profile found, but not a server error
              break;
            } else {
              console.error(`Profile fetch attempt ${retryCount + 1} failed:`, error.message);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
              }
              continue;
            }
          }

          profileData = data;
          break;
        } catch (err) {
          console.error(`Profile fetch attempt ${retryCount + 1} failed with exception:`, err.message);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
        }
      }

      if (profileData) {
        setProfileData({
          name: profileData.name || '',
          age: profileData.age || '',
          gender: profileData.gender || '',
          currentClass: profileData.current_class || '',
          location: profileData.location || '',
        });

        // Check if onboarding is completed directly from the profile
        const isComplete = profileData.onboarding_complete || false;
        setOnboardingComplete(isComplete);

        // Sync with AuthContext to ensure router knows we are onboarded
        if (isComplete && updateOnboardingStatus) {
          updateOnboardingStatus(true);
        }

        // Restore current step from DB
        if (!isComplete) {
          setCurrentStep(profileData.onboarding_step || 0);
        }

        // Fetch quiz data
        await fetchQuizData(user.id);

        // If we have category scores stored
        if (profileData.category_scores) {
          setQuizScores(profileData.category_scores);
        }

        if (profileData.career_suggestion) {
          setCareerSuggestion(profileData.career_suggestion);
        }
      } 
    } catch (error) {
      console.error('Error checking onboarding status:', error.message);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, updateOnboardingStatus]);



  // Helper function to fetch quiz data
  const fetchQuizData = async (userId) => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('user_id', userId);

      if (quizError) {
        console.error('Error fetching quiz responses:', quizError);
      } else if (quizData && quizData.length > 0) {
        setQuizResponses(quizData);
      }
    } catch (err) {
      console.error('Error in fetchQuizData:', err);
    }
  };

  // Check if user has completed onboarding
  useEffect(() => {
    if (user?.id) {
      checkOnboardingStatus();
    }
  }, [user?.id, checkOnboardingStatus]);

  const saveProfileData = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          name: profileData.name,
          age: profileData.age,
          gender: profileData.gender,
          current_class: profileData.currentClass,
          location: profileData.location,
          role: 'student',
          onboarding_step: 1, // Move to next step (Personality Test)
          updated_at: new Date(),
        });

      console.log('[OnboardingContext] saveProfileData result:', { error });

      if (error) throw error;

      // Update local state immediately
      setCurrentStep(1);
      return true;
    } catch (error) {
      console.error('Error saving profile data:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveQuizResponses = async () => {
    try {
      setIsLoading(true);

      // Save raw quiz responses
      const { error } = await supabase
        .from('quiz_responses')
        .upsert(
          quizResponses.map(response => ({
            user_id: user.id,
            question_id: response.questionId,
            answer_id: response.answerId,
            created_at: new Date(),
          }))
        );

      if (error) throw error;

      // Update profile with category scores and move to next step
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          category_scores: quizScores,
          onboarding_step: 2, // Move to next step (Radar Chart)
          updated_at: new Date(),
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Also ensure a record exists in personality_assessments for the backend service
      try {
        await supabase
          .from('personality_assessments')
          .upsert({
            user_id: user.id,
            status: 'in_progress',
            current_question_index: quizResponses.length,
            updated_at: new Date()
          }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn("Could not sync to personality_assessments (non-critical):", e);
      }

      if (profileError) throw profileError;

      setCurrentStep(2);
      return true;
    } catch (error) {
      console.error('Error saving quiz responses:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveCareerSuggestion = async (suggestion) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          career_suggestion: suggestion,
          onboarding_complete: true,
          onboarding_step: 4, // Completed
          updated_at: new Date(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCareerSuggestion(suggestion);
      setOnboardingComplete(true);
      return true;
    } catch (error) {
      console.error('Error saving career suggestion:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCategoryScores = (responses) => {
    // Count selections per category (case-insensitive)
    const counts = {
      Analytical: 0,
      Creative: 0,
      Social: 0,
      Business: 0,
      Science: 0,
    };

    responses.forEach(response => {
      const raw = (response.answerId || '').toString().toLowerCase();
      const cat = raw === 'tech' ? 'Science' :
        raw === 'analytical' ? 'Analytical' :
          raw === 'creative' ? 'Creative' :
            raw === 'social' ? 'Social' :
              raw === 'business' ? 'Business' :
                raw === 'science' ? 'Science' : null;
      if (cat) counts[cat] += 1;
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

  const nextStep = async () => {
    // If we are just moving between steps that don't require a save (like Radar Chart -> Career)
    // We should still update the DB to persist the step
    const nextStepIndex = currentStep + 1;

    // Only update DB if we are not in a step that already handles saving (like 0 and 1)
    // Step 2 is Radar Chart, clicking next goes to Step 3 (Career)
    if (currentStep === 2) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_step: nextStepIndex })
          .eq('user_id', user.id);
      } catch (e) {
        console.error("Error updating step", e);
      }
    }

    setCurrentStep(nextStepIndex);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const value = {
    profileData,
    setProfileData,
    quizResponses,
    setQuizResponses,
    quizScores,
    careerSuggestion,
    onboardingComplete,
    currentStep,
    isLoading,
    saveProfileData,
    saveQuizResponses,
    saveCareerSuggestion,
    calculateCategoryScores,
    nextStep,
    prevStep,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;