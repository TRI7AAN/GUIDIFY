import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';
import { supabase } from '../../utils/supabaseClient';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const TestContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 0.5rem;
  color: var(--text-light);
`;

const QuestionCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin-bottom: 1rem;
`;

const QuestionText = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1.2rem;
  color: #fff;
  line-height: 1.4;
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const OptionButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.9rem;
  border-radius: 12px;
  text-align: left;
  color: var(--text-light);
  transition: all 0.3s ease;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;

  &:hover {
    background: rgba(57, 255, 20, 0.1);
    border-color: var(--emerald-neon);
    transform: translateX(5px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--emerald-neon);
  transition: width 0.5s ease;
`;

const AIStreamBar = styled(motion.div)`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  margin-top: 1rem;
  overflow: hidden;
  position: relative;
`;

const AIStreamFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #3cff14, #4AD8E6);
  border-radius: 2px;
`;

const SkipButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.5);
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const AdaptivePersonalityTest = () => {
    const { user, updateOnboardingStatus } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiThinking, setAiThinking] = useState(false);
    const [aiQuestionsQueue, setAiQuestionsQueue] = useState([]);
    const [hasFetchedAI, setHasFetchedAI] = useState(false);
    const aiFetchStarted = useRef(false);

    // Start AI fetch IMMEDIATELY on mount — don't wait for static questions
    useEffect(() => {
        if (!user || aiFetchStarted.current) return;
        aiFetchStarted.current = true;

        const fetchAIQuestions = async () => {
            try {
                console.log("Starting AI question fetch immediately...");
                const res = await apiClient.post('/api/v1/psychometric/generate-quiz', { user_id: user.id });
                if (res.questions && res.questions.length > 0) {
                    console.log("AI Questions ready:", res.questions.length);
                    setAiQuestionsQueue(res.questions);
                }
            } catch (error) {
                console.error("AI fetch failed:", error);
            }
        };

        fetchAIQuestions();
    }, [user]);

    // Load static baseline questions
    useEffect(() => {
        const startTest = async () => {
            try {
                setLoading(true);
                const res = await apiClient.post('/api/v1/psychometric/start', { user_id: user?.id });
                if (res.questions) {
                    setQuestions(res.questions);
                }
            } catch (error) {
                console.error("Failed to start test:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) startTest();
    }, [user]);

    const handleAnswer = useCallback((option) => {
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return;

        const newResponse = {
            question_text: currentQuestion.question_text,
            selected_option: option
        };

        const updatedResponses = [...responses, newResponse];
        setResponses(updatedResponses);

        // Last question logic
        if (currentQuestionIndex === questions.length - 1) {
            // AI questions ready → inject and continue
            if (aiQuestionsQueue.length > 0) {
                setQuestions(prev => [...prev, ...aiQuestionsQueue]);
                setAiQuestionsQueue([]);
                setCurrentQuestionIndex(prev => prev + 1);
            }
            // Already past static (user answered AI questions) → finish
            else if (questions.length > 5) {
                setAnalyzing(true);
                finishTest(updatedResponses);
            }
            // AI not ready yet → show waiting state
            else {
                setAiThinking(true);
            }
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [questions, currentQuestionIndex, responses, aiQuestionsQueue]);

    // Handle late arrival of AI questions while user is waiting
    useEffect(() => {
        if (aiThinking && aiQuestionsQueue.length > 0) {
            setAiThinking(false);
            setQuestions(prev => [...prev, ...aiQuestionsQueue]);
            setAiQuestionsQueue([]);
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [aiQuestionsQueue, aiThinking]);

    const handleSkipToFinish = useCallback(() => {
        setAiThinking(false);
        setAnalyzing(true);
        finishTest(responses);
    }, [responses]);

    const finishTest = async (finalResponses) => {
        try {
            const res = await apiClient.post('/api/v1/psychometric/analyze', {
                user_id: user.id,
                all_responses: finalResponses
            });

            const traits = res.traits || res.category_scores || {};
            const { error } = await supabase
                .from('learners')
                .update({
                    category_scores: traits,
                    personality_analysis: res,
                    career_suggestion: res.summary || '',
                    onboarding_completed: true,
                })
                .eq('id', user.id);

            if (error) throw error;

            // No artificial delay — proceed immediately
            updateOnboardingStatus(true);
        } catch (error) {
            console.error("Analysis/Save failed:", error);
            setAnalyzing(false);
            alert("Submission failed. Please try again. Error: " + (error.message || "Unknown error"));
        }
    };

    // ── Analyzing Screen ────────────────────────────────────
    if (analyzing) {
        return (
            <TestContainer>
                <QuestionCard>
                    <div className="text-center py-10">
                        <h3 className="text-2xl font-bold mb-4 text-white">Analyzing Your Profile</h3>
                        <p className="text-gray-300 mb-8">
                            GUIDIFY is processing your responses to build a comprehensive personality map...
                        </p>
                        <div className="flex justify-center gap-2">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-4 h-4 bg-emerald-400 rounded-full"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                className="w-4 h-4 bg-blue-400 rounded-full"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                className="w-4 h-4 bg-purple-400 rounded-full"
                            />
                        </div>
                    </div>
                </QuestionCard>
            </TestContainer>
        );
    }

    // ── Empty State ─────────────────────────────────────────
    if (!loading && questions.length === 0) {
        return (
            <TestContainer>
                <div className="text-center text-red-400 mt-10">
                    <h3 className="text-xl">Unable to load questions.</h3>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                        Retry
                    </button>
                </div>
            </TestContainer>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const totalExpected = 10; // 5 static + 5 AI
    const isStaticPhase = questions.length <= 5;
    const progressPct = isStaticPhase
        ? ((currentQuestionIndex + 1) / 5) * 50 // First half = 0-50%
        : 50 + ((currentQuestionIndex - 5) / (questions.length - 5)) * 50; // Second half = 50-100%

    return (
        <TestContainer>
            <ProgressBar>
                <ProgressFill style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </ProgressBar>

            <AnimatePresence mode="wait">
                {currentQuestion && (
                    <QuestionCard
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <QuestionText>{currentQuestion.question_text}</QuestionText>

                        <OptionsGrid>
                            {currentQuestion.options?.map((option, idx) => (
                                <OptionButton
                                    key={idx}
                                    onClick={() => handleAnswer(option)}
                                    disabled={aiThinking}
                                >
                                    {option.text}
                                </OptionButton>
                            ))}
                        </OptionsGrid>

                        {/* AI thinking state — streaming progress bar */}
                        {aiThinking && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="mt-5 text-center">
                                    <p className="text-emerald-400 text-sm font-medium mb-2">
                                        Personalizing your assessment...
                                    </p>
                                    <p className="text-gray-500 text-xs mb-3">
                                        AI is generating questions tailored to your responses
                                    </p>
                                    <AIStreamBar>
                                        <AIStreamFill
                                            initial={{ width: '0%' }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 8, ease: 'linear' }}
                                        />
                                    </AIStreamBar>
                                    <SkipButton onClick={handleSkipToFinish}>
                                        Skip & finish with current results
                                    </SkipButton>
                                </div>
                            </motion.div>
                        )}
                    </QuestionCard>
                )}
            </AnimatePresence>
        </TestContainer>
    );
};

export default AdaptivePersonalityTest;
