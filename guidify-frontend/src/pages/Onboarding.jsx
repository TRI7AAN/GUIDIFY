/**
 * Onboarding Page — Multi-step flow
 * 
 * Steps:
 *   1. ProfileForm — name, age, gender, status, location
 *   2. CareerGoalsForm — target role, skills, interests, learning hours (NEW)
 *   3. AdaptivePersonalityTest — AI personality quiz
 * 
 * Per design.md §2.1: Onboarding ≤ 5 steps. Converts to TailwindCSS.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileForm from '../components/onboarding/ProfileForm';
import CareerGoalsForm from '../components/onboarding/CareerGoalsForm';
import ConsentStep from '../components/onboarding/ConsentStep';
import AdaptivePersonalityTest from '../components/onboarding/AdaptivePersonalityTest';

const Onboarding = () => {
  const { currentStep, isLoading: contextLoading } = useOnboarding();
  const { user, onboardingComplete, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect Logic
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (onboardingComplete) { navigate('/dashboard'); }
  }, [user, onboardingComplete, authLoading, navigate]);

  // Steps Definition
  const steps = [
    { title: 'Profile Information', component: <ProfileForm /> },
    { title: 'Career Goals', component: <CareerGoalsForm /> },
    { title: 'Data Consent', component: <ConsentStep /> },
    { title: 'AI Personality Analysis', component: <AdaptivePersonalityTest /> },
  ];

  if (authLoading || contextLoading) {
    return (
      <div className="min-h-0 bg-surface-50 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-surface-800 font-medium font-display">Setting up your journey...</p>
        </div>
      </div>
    );
  }

  const activeStepIndex = Math.min(Math.max(0, currentStep), steps.length - 1);
  const activeStep = steps[activeStepIndex];
  const progress = ((activeStepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-0 bg-surface-50 flex flex-col items-center justify-start overflow-y-auto">
      <div className="w-full max-w-4xl px-4 pt-4 pb-6">
        {/* Header */}
        <header className="text-center mb-3 animate-fade-in-up">
          <h1 className="text-2xl font-display font-bold text-surface-900 mb-1">
            Welcome to GUIDIFY
          </h1>
          <p className="text-primary-600 font-medium text-sm">
            Let's build your personalized career roadmap
          </p>
        </header>

        {/* Progress bar */}
        <div className="max-w-lg mx-auto mb-4 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center justify-between mb-1.5">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  idx <= activeStepIndex
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-200 text-surface-800/50'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${
                  idx <= activeStepIndex ? 'text-primary-600' : 'text-surface-800/40'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="glass-card p-5 max-w-2xl mx-auto">
            {activeStep ? activeStep.component : <div>Loading Step...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;