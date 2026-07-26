import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileForm from '../components/onboarding/ProfileForm';
import AdaptivePersonalityTest from '../components/onboarding/AdaptivePersonalityTest';
import { useTranslation } from 'react-i18next';

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
  const { currentStep, isLoading: contextLoading } = useOnboarding();
  const { user, onboardingComplete, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Redirect Logic
  useEffect(() => {
    // Wait for auth to settle
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (onboardingComplete) {
      navigate('/dashboard');
    }
  }, [user, onboardingComplete, authLoading, navigate]);

  // Steps Definition
  const steps = [
    { title: 'Profile Information', component: <ProfileForm /> },
    { title: 'AI Personality Analysis', component: <AdaptivePersonalityTest /> },
  ];

  // While loading auth or checking step status
  if (authLoading || contextLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a] text-[#39FF14]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#39FF14] border-t-transparent"></div>
          <p>Syncing Destiny...</p>
        </div>
      </div>
    );
  }

  // Safe Indexing
  const activeStepIndex = Math.min(Math.max(0, currentStep), steps.length - 1);
  const activeStep = steps[activeStepIndex];
  const progress = ((activeStepIndex + 1) / steps.length) * 100;

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
            Step {activeStepIndex + 1}: {activeStep?.title || 'Loading'}
          </h2>

          {/* Current step component */}
          <StepContainer>
            {activeStep ? activeStep.component : <div>Loading Step...</div>}
          </StepContainer>
        </div>
      </ContentWrapper>
    </OnboardingContainer>
  );
};

export default Onboarding;