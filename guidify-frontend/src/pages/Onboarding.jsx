import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import ProfileForm from '../components/onboarding/ProfileForm';
import AdaptivePersonalityTest from '../components/onboarding/AdaptivePersonalityTest';

import styled from 'styled-components';

// Styled components to match LandingPage theme
const OnboardingContainer = styled.div`
  min-height: 100vh;
  background: var(--deep-space-gradient);
  color: var(--text-light);
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const StepContainer = styled.div`
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
`;

const ProgressBar = styled.div`
  width: 100%;
  background: rgba(30, 30, 60, 0.5);
  border-radius: 999px;
  height: 8px;
  margin-bottom: 2rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  background: var(--emerald-neon);
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease-in-out;
  box-shadow: 0 0 10px var(--emerald-neon);
`;

const Onboarding = () => {
  const {
    currentStep,
    onboardingComplete,
    isLoading,
    nextStep,
    prevStep
  } = useOnboarding();

  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if onboarding is already complete or if user is not authenticated
  useEffect(() => {
    if (!isLoading && onboardingComplete) {
      navigate('/dashboard');
    } else if (!isLoading && !user) {
      navigate('/login');
    }
  }, [onboardingComplete, navigate, user, isLoading]);

  // Steps for the onboarding process
  const steps = [
    { title: 'Profile Information', component: <ProfileForm /> },
    { title: 'AI Personality Analysis', component: <AdaptivePersonalityTest /> },
  ];

  // Safety check: If currentStep is out of bounds, redirect to dashboard
  useEffect(() => {
    if (user && !isLoading && currentStep >= steps.length) {
      console.warn("Current step is out of bounds, redirecting to dashboard");
      navigate('/dashboard');
    }
  }, [currentStep, steps.length, user, isLoading, navigate]);

  // Progress percentage calculation
  const progress = ((currentStep + 1) / steps.length) * 100;

  // If user is not authenticated or loading, show loading state
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#39FF14', fontSize: '2rem' }}>
        <span>Loading user...</span>
      </div>
    ); // Will redirect to login via useEffect
  }

  return (
    <OnboardingContainer>
      <ContentWrapper>
        <div>
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2 text-white">Welcome to GUIDIFY</h1>
            <p className="text-lg" style={{ color: 'var(--emerald-neon)' }}>Let's set up your profile and discover your career path</p>
          </header>

          {/* Progress bar */}
          <ProgressBar>
            <ProgressFill style={{ width: `${progress}%` }} />
          </ProgressBar>

          {/* Step title */}
          <h2 className="text-2xl font-semibold mb-6 text-center text-white">
            Step {currentStep + 1}: {steps[currentStep]?.title || ''}
          </h2>

          {/* Current step component */}
          <StepContainer>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--emerald-neon)' }}></div>
              </div>
            ) : (
              steps[currentStep]?.component
            )}
          </StepContainer>
        </div>
      </ContentWrapper>
    </OnboardingContainer>
  );
};

export default Onboarding;