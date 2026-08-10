/**
 * PsychometricFitCheck — Optional "Quick Fit Check" onboarding step
 *
 * Per design.md §6: Framed as "Quick Fit Check", not "Personality Test".
 * Optional, skippable. Shows interpretive results only — never raw scores.
 *
 * Per api.md §7: POST /profile/psychometrics returns narrative only.
 * Per rules.md §9: Separate consent, 6-month retake cooldown.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import apiClient, { getErrorMessage } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 700px;
  margin: 0 auto;
  padding: 0.5rem;
  color: var(--text-light);
`;

const Card = styled(motion.div)`
  background: rgba(30, 30, 60, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin-bottom: 1rem;
`;

const OptionButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.85rem;
  border-radius: 12px;
  text-align: left;
  color: var(--text-light);
  transition: all 0.3s ease;
  font-size: 0.95rem;
  cursor: pointer;

  &:hover {
    background: rgba(57, 255, 20, 0.1);
    border-color: var(--emerald-neon);
    transform: translateX(4px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--emerald-neon);
  transition: width 0.4s ease;
`;

const SkipLink = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  cursor: pointer;
  margin-top: 0.75rem;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const PsychometricFitCheck = () => {
  const { nextStep } = useOnboarding();
  const { user } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const consentIdRef = useRef(null);
  const autoSubmittedRef = useRef(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Load instrument items from config files
  useEffect(() => {
    const loadItems = async () => {
      try {
        // Fetch instrument configs from backend
        const [ipipRes, riasecRes] = await Promise.all([
          fetch('/api/v1/psychometric/instruments/ipip').catch(() => null),
          fetch('/api/v1/psychometric/instruments/riasec').catch(() => null),
        ]);

        let items = [];

        if (ipipRes?.ok) {
          const ipip = await ipipRes.json();
          items = [...items, ...ipip.items.map(i => ({ ...i, instrument: 'ipip' }))];
        } else {
          // Fallback: inline the item texts for the UI
          items = [...items, ...getIPIPFallbackItems()];
        }

        if (riasecRes?.ok) {
          const riasec = await riasecRes.json();
          items = [...items, ...riasec.items.map(i => ({ ...i, instrument: 'riasec' }))];
        } else {
          items = [...items, ...getRIASECFallbackItems()];
        }

        setAllItems(items);
      } catch {
        // Use fallback items
        setAllItems([...getIPIPFallbackItems(), ...getRIASECFallbackItems()]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  const handleAnswer = useCallback((item, value) => {
    setAnswers(prev => ({ ...prev, [item.id]: value }));
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleSkip = useCallback(async () => {
    // Skip — proceed without psychometric data
    nextStep();
  }, [nextStep]);

  // Dedicated, explicit psychometric consent (rules.md §9.3, design.md §6.4).
  // Record created when the learner opts in by starting the fit check.
  const startFitCheck = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('consents')
        .insert({
          learner_id: user.id,
          consent_type: 'psychometric',
          granted: true,
          source: 'onboarding_fit_check',
          metadata: { instruments: 'ipip+riasec' },
        })
        .select('id')
        .single();
      if (error || !data?.id) throw error || new Error('Consent could not be saved');
      consentIdRef.current = data.id;
      setCurrentIndex(1);
    } catch {
      setError('Could not save your consent. Please try again.');
    }
  }, [user]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!consentIdRef.current) {
        throw new Error('Consent is required before submitting your fit check.');
      }
      const answerPayload = Object.entries(answers).map(([item_id, value]) => ({
        item_id,
        value,
      }));

      const res = await apiClient.post('/api/v1/profile/psychometrics', {
        consent_id: consentIdRef.current,
        answers: answerPayload,
      });

      setResult(res);
      // Auto-advance after showing results (with cleanup)
      timeoutRef.current = setTimeout(() => nextStep(), 3000);
    } catch (e) {
      const msg = getErrorMessage(e, 'Submission failed');
      setError(typeof msg === 'string' ? msg : 'Something went wrong');
      setSubmitting(false);
    }
  }, [answers, nextStep]);

  // Auto-submit when all questions answered — guarded so a failure shows an
  // error + retry instead of hammering the API in an infinite loop.
  const isComplete = currentIndex >= allItems.length && allItems.length > 0;
  useEffect(() => {
    if (isComplete && !autoSubmittedRef.current && !result) {
      autoSubmittedRef.current = true;
      handleSubmit();
    }
  }, [isComplete, result, handleSubmit]);

  // ── Results Screen ────────────────────────────────────────
  if (result) {
    return (
      <Container>
        <Card>
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-3xl">✨</span>
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-3">Your Fit Check is Complete</h3>
            {result.narrative_summary && (
              <p className="text-gray-300 max-w-md mx-auto leading-relaxed mb-4">
                {result.narrative_summary}
              </p>
            )}
            <p className="text-gray-500 text-sm">
              We've personalized your roadmap to match how you work best.
            </p>
          </div>
        </Card>
      </Container>
    );
  }

  // ── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <Container>
        <Card>
          <div className="text-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Preparing your fit check...</p>
          </div>
        </Card>
      </Container>
    );
  }

  const currentItem = allItems[currentIndex];
  const totalItems = allItems.length;
  const progressPct = totalItems > 0 ? ((currentIndex) / totalItems) * 100 : 0;

  // ── Loading/Submitting State ──────────────────────────────
  if (submitting && !result) {
    return (
      <Container>
        <Card>
          <div className="text-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Processing your responses...</p>
          </div>
        </Card>
      </Container>
    );
  }

  // ── Submission Failure State ─────────────────────────────
  if (isComplete && error && !result) {
    return (
      <Container>
        <Card>
          <div className="text-center py-6">
            <h3 className="text-lg font-semibold text-white mb-2">We hit a snag</h3>
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={handleSubmit}
              className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </Card>
      </Container>
    );
  }

  // ── Intro Screen ──────────────────────────────────────────
  if (currentIndex === 0 && Object.keys(answers).length === 0) {
    return (
      <Container>
        <Card>
          <div className="text-center py-6">
            <h3 className="text-xl font-bold text-white mb-3">Quick Fit Check</h3>
            <p className="text-gray-300 mb-4 max-w-md mx-auto leading-relaxed">
              This helps us tailor your roadmap's pace and style to how you work best.
              Takes about 2 minutes. Completely optional.
            </p>
            <p className="text-gray-500 text-xs mb-6">
              Your answers shape how we present missions — never what careers we suggest.
            </p>
            {error && (
              <p className="text-red-400 text-xs mb-4">{error}</p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={startFitCheck}
                className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                Start Fit Check
              </button>
              <SkipLink onClick={handleSkip}>
                Skip for now
              </SkipLink>
            </div>
          </div>
        </Card>
      </Container>
    );
  }

  // ── Question Screen ───────────────────────────────────────
  if (!currentItem) return null;

  return (
    <Container>
      <ProgressBar>
        <ProgressFill style={{ width: `${progressPct}%` }} />
      </ProgressBar>

      <AnimatePresence mode="wait">
        <Card
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
        >
          <p className="text-xs text-gray-500 mb-2">
            {currentIndex} of {totalItems}
          </p>
          <h3 className="text-lg font-semibold text-white mb-5 leading-relaxed">
            {currentItem.text}
          </h3>

          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((value) => (
              <OptionButton
                key={value}
                onClick={() => handleAnswer(currentItem, value)}
              >
                {getLikertLabel(value)}
              </OptionButton>
            ))}
          </div>

          <SkipLink onClick={handleSkip}>
            Skip this assessment
          </SkipLink>

          {error && (
            <p className="text-red-400 text-xs mt-3">{error}</p>
          )}
        </Card>
      </AnimatePresence>
    </Container>
  );
};

// ── Helpers ────────────────────────────────────────────────────

function getLikertLabel(value) {
  const labels = {
    5: 'Strongly Agree',
    4: 'Agree',
    3: 'Neutral',
    2: 'Disagree',
    1: 'Strongly Disagree',
  };
  return labels[value] || '';
}

function getIPIPFallbackItems() {
  return [
    { id: 'ipip_1', text: 'I am the life of the party.', instrument: 'ipip' },
    { id: 'ipip_2', text: "I don't talk a lot.", instrument: 'ipip' },
    { id: 'ipip_3', text: 'I feel comfortable around people.', instrument: 'ipip' },
    { id: 'ipip_4', text: 'I keep in the background.', instrument: 'ipip' },
    { id: 'ipip_5', text: 'I get stressed out easily.', instrument: 'ipip' },
    { id: 'ipip_6', text: 'I am relaxed most of the time.', instrument: 'ipip' },
    { id: 'ipip_7', text: 'I worry about things.', instrument: 'ipip' },
    { id: 'ipip_8', text: 'I seldom feel blue.', instrument: 'ipip' },
    { id: 'ipip_9', text: 'I have a vivid imagination.', instrument: 'ipip' },
    { id: 'ipip_10', text: 'I have difficulty understanding abstract ideas.', instrument: 'ipip' },
    { id: 'ipip_11', text: 'I enjoy hearing new ideas.', instrument: 'ipip' },
    { id: 'ipip_12', text: 'I do not like art.', instrument: 'ipip' },
    { id: 'ipip_13', text: 'I feel little concern for others.', instrument: 'ipip' },
    { id: 'ipip_14', text: "I am interested in people's problems.", instrument: 'ipip' },
    { id: 'ipip_15', text: 'I insult people.', instrument: 'ipip' },
    { id: 'ipip_16', text: "I sympathize with others' feelings.", instrument: 'ipip' },
    { id: 'ipip_17', text: 'I am always prepared.', instrument: 'ipip' },
    { id: 'ipip_18', text: 'I leave my belongings around.', instrument: 'ipip' },
    { id: 'ipip_19', text: 'I pay attention to details.', instrument: 'ipip' },
    { id: 'ipip_20', text: 'I make a mess of things.', instrument: 'ipip' },
  ];
}

function getRIASECFallbackItems() {
  return [
    { id: 'ria_1', text: 'Build things with your hands.', instrument: 'riasec' },
    { id: 'ria_2', text: 'Work outdoors or with nature.', instrument: 'riasec' },
    { id: 'ria_3', text: 'Use tools, machines, or vehicles.', instrument: 'riasec' },
    { id: 'ria_4', text: 'Investigate scientific problems.', instrument: 'riasec' },
    { id: 'ria_5', text: 'Analyze data or ideas.', instrument: 'riasec' },
    { id: 'ria_6', text: 'Solve complex puzzles.', instrument: 'riasec' },
    { id: 'ria_7', text: 'Express yourself through art or writing.', instrument: 'riasec' },
    { id: 'ria_8', text: 'Create original works.', instrument: 'riasec' },
    { id: 'ria_9', text: 'Perform or entertain others.', instrument: 'riasec' },
    { id: 'ria_10', text: 'Help or teach others.', instrument: 'riasec' },
    { id: 'ria_11', text: 'Work in a team to solve problems.', instrument: 'riasec' },
    { id: 'ria_12', text: 'Counsel or support people.', instrument: 'riasec' },
    { id: 'ria_13', text: 'Lead or direct a team.', instrument: 'riasec' },
    { id: 'ria_14', text: 'Sell products or ideas.', instrument: 'riasec' },
    { id: 'ria_15', text: 'Convince people to take action.', instrument: 'riasec' },
    { id: 'ria_16', text: 'Organize data or records.', instrument: 'riasec' },
    { id: 'ria_17', text: 'Follow a detailed procedure.', instrument: 'riasec' },
    { id: 'ria_18', text: 'Work with numbers accurately.', instrument: 'riasec' },
  ];
}

export default PsychometricFitCheck;
