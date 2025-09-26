import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';
import { supabase } from '../../utils/supabaseClient';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const TestContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-light);
`;

const QuestionCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin-bottom: 2rem;
`;

const QuestionText = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 2rem;
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
  padding: 1.2rem;
  border-radius: 12px;
  text-align: left;
  color: var(--text-light);
  transition: all 0.3s ease;
  font-size: 1.1rem;
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

const AIThinking = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--emerald-neon);
  font-size: 1.1rem;
  margin-top: 2rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 2rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--emerald-neon);
  transition: width 0.5s ease;
`;

const AdaptivePersonalityTest = () => {
    const { nextStep } = useOnboarding();
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiThinking, setAiThinking] = useState(false);
    const [aiQuestionsQueue, setAiQuestionsQueue] = useState([]);
    const [hasFetchedAI, setHasFetchedAI] = useState(false);

    console.log("Supabase client status:", supabase ? "Defined" : "Undefined");

    // Initialize test with static questions
    useEffect(() => {
        const startTest = async () => {
            try {
                setLoading(true);
                // Fetch baseline questions (static)
                const res = await apiClient.post('/api/psychometric/start', { user_id: user?.id });
                if (res.questions) {
                    setQuestions(res.questions);
                }
            } catch (error) {
                console.error("Failed to start test:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            startTest();
        }
    }, [user]);

    // Trigger AI pre-fetch once static questions are loaded
    useEffect(() => {
        const preFetchAIQuestions = async () => {
            if (questions.length > 0 && !hasFetchedAI) {
                setHasFetchedAI(true);
                try {
                    console.log("Triggering background AI fetch...");
                    const res = await apiClient.post('/api/psychometric/generate-quiz', { user_id: user?.id });
                    if (res.questions && res.questions.length > 0) {
                        console.log("AI Questions fetched successfully:", res.questions.length);
                        setAiQuestionsQueue(res.questions);
                    }
                } catch (error) {
                    console.error("Background AI fetch failed:", error);
                    // Fallback logic could go here if needed
                }
            }
        };

        preFetchAIQuestions();
    }, [questions, hasFetchedAI, user]);

    const handleAnswer = async (option) => {
        const currentQuestion = questions[currentQuestionIndex];

        // Record response
        const newResponse = {
            question_text: currentQuestion.question_text,
            selected_option: option
        };

        const updatedResponses = [...responses, newResponse];
        setResponses(updatedResponses);

        // Check if we are at the last question
        if (currentQuestionIndex === questions.length - 1) {
            // Case 1: We have AI questions ready to append
            if (aiQuestionsQueue.length > 0) {
                setQuestions(prev => [...prev, ...aiQuestionsQueue]);
                setAiQuestionsQueue([]);
                setCurrentQuestionIndex(prev => prev + 1);
            }
            // Case 2: We are past the static questions (length > 5) -> FINISH
            else if (questions.length > 5) {
                setAnalyzing(true); // Immediate UI feedback
                await finishTest(updatedResponses);
            }
            // Case 3: We are at end of static questions but AI is not ready -> WAIT
            else {
                setAiThinking(true);
            }
        } else {
            // Just move to next question
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    // Effect to handle late arrival of AI questions if user was waiting
    useEffect(() => {
        if (aiThinking && aiQuestionsQueue.length > 0) {
            setAiThinking(false);
            setQuestions(prev => [...prev, ...aiQuestionsQueue]);
            setAiQuestionsQueue([]);
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [aiQuestionsQueue, aiThinking]);

    const finishTest = async (finalResponses) => {
        if (!analyzing) setAnalyzing(true);
        try {
            // 1. Get Analysis from Backend
            const res = await apiClient.post('/api/psychometric/analyze', {
                user_id: user.id,
                all_responses: finalResponses
            });

            console.log("Analysis complete:", res);

            // 2. Save to Supabase Profiles Table (Frontend Save)
            const { error } = await supabase
                .from('profiles')
                .update({
                    personality_analysis: res,
                    onboarding_complete: true,
                    onboarding_step: 2
                })
                .eq('user_id', user.id);

            if (error) {
                console.error("Error saving profile:", error);
                throw error;
            }

            // 3. HARD Redirect to Dashboard
            window.location.href = '/dashboard';
        } catch (error) {
            console.error("Analysis/Save failed:", error);
            setAnalyzing(false);
            alert("Submission failed. Please try again. Error: " + (error.message || "Unknown error"));
        }
    };

    if (analyzing) {
        return (
            <TestContainer>
                <QuestionCard>
                    <div className="text-center py-10">
                        <h3 className="text-2xl font-bold mb-4 text-white">Analyzing Your Profile</h3>
                        <p className="text-gray-300 mb-8">
                            GUIDIFY processing your responses to build a comprehensive personality map...
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

    return (
        <TestContainer>
            <ProgressBar>
                <ProgressFill style={{ width: `${((currentQuestionIndex) / 15) * 100}%` }} />
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

                        {aiThinking && (
                            <AIThinking
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <span className="animate-pulse">Analysing personalisation questions...</span>
                            </AIThinking>
                        )}
                    </QuestionCard>
                )}
            </AnimatePresence>
        </TestContainer>
    );
};

export default AdaptivePersonalityTest;
