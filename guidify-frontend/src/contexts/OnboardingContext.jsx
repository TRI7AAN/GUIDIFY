import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
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
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState(0);

  // Memoized function to check onboarding status with timeout and retry logic
  const checkOnboardingStatus = useCallback(async (forceRefresh = false) => {
    // Prevent excessive calls - only check once every 5 seconds unless forced
    const now = Date.now();
    if (!forceRefresh && now - lastCheckTimestamp < 5000) {
      return;
    }
    
    // Reset error state
    setError(null);
    
    try {
      if (!user || !user.id) {
        setError('User not authenticated or missing ID');
        return;
      }
      
      setIsLoading(true);
      setLastCheckTimestamp(now);
      
      // Set a timeout to prevent getting stuck in loading state
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setError('Request timed out. Please try again.');
          console.warn('Onboarding status check timed out');
        }
      }, 10000); // 10 second timeout
      
      // Try to use existing profile from AuthContext if available
      if (userProfile && !forceRefresh) {
        setProfileData({
          name: userProfile.name || '',
          age: userProfile.age || '',
          gender: userProfile.gender || '',
          currentClass: userProfile.current_class || '',
          location: userProfile.location || '',
        });
        
        setOnboardingComplete(userProfile.onboarding_complete || false);
        
        // Still fetch quiz data
        await fetchQuizData(user.id);
        clearTimeout(timeoutId);
        setIsLoading(false);
        return;
      }
      
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
              console.warn('No profile found for user, may need to create one');
              break;
            } else {
              console.error(`Profile fetch attempt ${retryCount + 1} failed:`, error);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              continue;
            }
          }
          
          profileData = data;
          break;
        } catch (err) {
          console.error(`Profile fetch attempt ${retryCount + 1} failed with exception:`, err);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
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
        setOnboardingComplete(profileData.onboarding_complete || false);
        
        // Fetch quiz data
        await fetchQuizData(user.id);
        
        // If we have category scores stored
        if (profileData.category_scores) {
          setQuizScores(profileData.category_scores);
        }
        
        if (profileData.career_suggestion) {
          setCareerSuggestion(profileData.career_suggestion);
        }
      } else {
        setError('Could not retrieve profile data. Please try again.');
      }
      
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile, isLoading, lastCheckTimestamp]);
  
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

  // Check if user has completed onboarding with debounce
  useEffect(() => {
    let isMounted = true;
    
    if (user) {
      // Add a small delay to prevent race conditions with AuthContext
      const timer = setTimeout(() => {
        if (isMounted) {
          checkOnboardingStatus();
        }
      }, 300);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [user, checkOnboardingStatus]);

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
          updated_at: new Date(),
        });

      if (error) throw error;
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
      
      // Update profile with category scores
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          category_scores: quizScores,
          updated_at: new Date(),
        })
        .eq('user_id', user.id);
        
      if (profileError) throw profileError;
      
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
          onboarding_completed: true,
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
    // This is a simplified scoring algorithm
    // In a real app, you would have a more sophisticated scoring system
    const scores = {
      Analytical: 0,
      Creative: 0,
      Social: 0,
      Business: 0,
      Science: 0,
    };

    // Example scoring logic
    responses.forEach(response => {
      switch (response.answerId) {
        case 'analytical':
          scores.Analytical += 20;
          break;
        case 'creative':
          scores.Creative += 20;
          break;
        case 'social':
          scores.Social += 20;
          break;
        case 'business':
          scores.Business += 20;
          break;
        case 'science':
          scores.Science += 20;
          break;
        // Add more cases based on your quiz structure
      }
    });

    setQuizScores(scores);
    return scores;
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
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