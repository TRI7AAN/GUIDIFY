/**
 * PsychometricTestPage — Full psychometric assessment flow
 * 
 * Three phases:
 *   1. Intro screen — explains the test, "Start Assessment" CTA
 *   2. Question stepper — one at a time, yes/maybe/no, progress bar, timer
 *   3. Results view — scores, career recommendations, personality profile
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { psychometricTestAPI } from '../lib/api';
import { queryKeys } from '../hooks/query';
import {
  ChevronLeft, Brain, Sparkles, CheckCircle2, AlertTriangle,
  ArrowRight, RotateCcw, Clock, Target, TrendingUp,
  Zap, Users, Lightbulb, BarChart3, Award
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Technical Aptitude': Zap,
  'Creative Thinking': Lightbulb,
  'Leadership': Award,
  'Analytical Reasoning': BarChart3,
  'Interpersonal Skills': Users,
};

const CATEGORY_COLORS = {
  'Technical Aptitude': { accent: '#3cff14', bg: 'bg-[#3cff14]/10', text: 'text-[#3cff14]' },
  'Creative Thinking': { accent: '#f472b6', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  'Leadership': { accent: '#fbbf24', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'Analytical Reasoning': { accent: '#4AD8E6', bg: 'bg-[#4AD8E6]/10', text: 'text-[#4AD8E6]' },
  'Interpersonal Skills': { accent: '#a78bfa', bg: 'bg-violet-500/10', text: 'text-violet-400' },
};

function CircularScore({ score, size = 120, strokeWidth = 8, color = '#3cff14' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1F2330" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-display font-bold text-white">{Math.round(score)}</span>
        <span className="text-[10px] text-[#A4ACBC]">/ 100</span>
      </div>
    </div>
  );
}

function IntroScreen({ onStart, loading }) {
  return (
    <div className="max-w-xl mx-auto text-center animate-fade-in-up">
      <div className="w-20 h-20 rounded-2xl bg-[#3cff14]/10 flex items-center justify-center mx-auto mb-6">
        <Brain className="w-10 h-10 text-[#3cff14]" />
      </div>
      <h2 className="text-3xl font-display font-bold text-white mb-3">
        Psychometric Assessment
      </h2>
      <p className="text-[#A4ACBC] mb-8 leading-relaxed max-w-md mx-auto">
        Discover your strengths across 5 career dimensions. Answer 30 quick questions — 
        there are no right or wrong answers. Your responses will shape personalized career recommendations.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
        {Object.entries(CATEGORY_ICONS).map(([cat, Icon]) => {
          const colors = CATEGORY_COLORS[cat];
          return (
            <div key={cat} className={`flex items-center gap-3 p-3 rounded-xl bg-[#151821] border border-[#1F2330]`}>
              <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${colors.text}`} />
              </div>
              <span className="text-sm text-[#A4ACBC] font-medium">{cat}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#151821] border border-[#1F2330]">
          <div className="w-9 h-9 rounded-lg bg-[#1F2330] flex items-center justify-center shrink-0">
            <Clock className="w-4.5 h-4.5 text-[#A4ACBC]" />
          </div>
          <span className="text-sm text-[#A4ACBC] font-medium">~5 minutes</span>
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={loading}
        className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity focus-ring flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Loading questions...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Start Assessment
          </>
        )}
      </button>
    </div>
  );
}

function QuestionStepper({ questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const category = question?.category || '';
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Technical Aptitude'];
  const Icon = CATEGORY_ICONS[category] || Brain;

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setSelectedAnswer(null);
  }, [currentIndex]);

  const handleAnswer = useCallback((value) => {
    if (isTransitioning) return;
    setSelectedAnswer(value);
    setIsTransitioning(true);

    const responseTime = Date.now() - questionStartTime;
    const newAnswers = {
      ...answers,
      [question.id]: {
        question_id: question.id,
        answer: value,
        response_time_ms: responseTime,
      },
    };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(Object.values(newAnswers));
      }
      setIsTransitioning(false);
    }, 400);
  }, [currentIndex, answers, question, questionStartTime, isTransitioning, questions.length, onComplete]);

  const answerOptions = [
    { value: 'yes', label: 'Yes', emoji: '✓', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' },
    { value: 'maybe', label: 'Maybe', emoji: '~', color: 'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' },
    { value: 'no', label: 'No', emoji: '✗', color: 'border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20' },
  ];

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#A4ACBC] font-medium">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {category}
          </span>
        </div>
        <div className="w-full h-2 bg-[#1F2330] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${colors.accent}88, ${colors.accent})` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        key={currentIndex}
        className="bg-[#151821] border border-[#1F2330] rounded-2xl p-8 mb-6 animate-fade-in-up"
      >
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-5`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        <p className="text-lg text-white font-medium leading-relaxed">
          {question.text}
        </p>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-3 gap-3">
        {answerOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleAnswer(opt.value)}
            disabled={isTransitioning}
            className={`
              p-4 rounded-xl border-2 transition-all duration-200 font-semibold text-center
              ${selectedAnswer === opt.value
                ? opt.color + ' scale-95 ring-2 ring-offset-2 ring-offset-[#0D0F18]'
                : 'border-[#1F2330] bg-[#151821] text-[#A4ACBC] hover:border-[#3cff14]/30'
              }
              ${isTransitioning && selectedAnswer !== opt.value ? 'opacity-40' : ''}
            `}
          >
            <span className="text-2xl block mb-1">{opt.emoji}</span>
            <span className="text-sm">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Quick navigation hint */}
      <p className="text-center text-xs text-[#A4ACBC]/40 mt-4">
        Click to answer and automatically advance
      </p>
    </div>
  );
}

function ResultsView({ result, onRetake }) {
  if (!result) return null;

  const sortedScores = [...(result.category_scores || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
      {/* Overall score */}
      <div className="bg-[#151821] border border-[#1F2330] rounded-2xl p-8 text-center">
        <h3 className="text-xl font-display font-bold text-white mb-6">Your Assessment Results</h3>
        <CircularScore score={result.overall_score} size={140} />
        <p className="text-sm text-[#A4ACBC] mt-3">
          Overall Score · {Math.round(result.confidence * 100)}% confidence
        </p>
      </div>

      {/* Career recommendations */}
      <div className="bg-[#151821] border border-[#1F2330] rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#3cff14]" />
          Career Recommendations
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-[#3cff14]/5 border border-[#3cff14]/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3cff14] mb-1 block">Primary</span>
            <span className="text-white font-display font-semibold">{result.primary_recommendation}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#4AD8E6]/5 border border-[#4AD8E6]/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4AD8E6] mb-1 block">Secondary</span>
            <span className="text-white font-display font-semibold">{result.secondary_recommendation}</span>
          </div>
        </div>
      </div>

      {/* Category scores */}
      <div className="bg-[#151821] border border-[#1F2330] rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#4AD8E6]" />
          Category Breakdown
        </h4>
        <div className="space-y-3">
          {sortedScores.map((cs) => {
            const colors = CATEGORY_COLORS[cs.category] || CATEGORY_COLORS['Technical Aptitude'];
            const Icon = CATEGORY_ICONS[cs.category] || Brain;
            return (
              <div key={cs.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-sm text-white font-medium">{cs.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {cs.label}
                    </span>
                    <span className="text-sm font-bold text-white w-8 text-right">{Math.round(cs.score)}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#1F2330] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${cs.score}%`, backgroundColor: colors.accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personality profile */}
      <div className="bg-[#151821] border border-[#1F2330] rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          Personality Profile
        </h4>
        <p className="text-sm text-[#A4ACBC] leading-relaxed">{result.personality_profile}</p>
      </div>

      {/* Strengths & Growth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {result.strengths?.length > 0 && (
          <div className="bg-[#151821] border border-[#1F2330] rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#3cff14]" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-sm text-[#A4ACBC] flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#3cff14] shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.growth_areas?.length > 0 && (
          <div className="bg-[#151821] border border-[#1F2330] rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Growth Areas
            </h4>
            <ul className="space-y-2">
              {result.growth_areas.map((g, i) => (
                <li key={i} className="text-sm text-[#A4ACBC] flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-[#151821] border border-[#1F2330] rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
        <p className="text-sm text-[#A4ACBC] leading-relaxed">{result.summary}</p>
      </div>

      {/* Retake button */}
      <button
        onClick={onRetake}
        className="w-full bg-[#151821] border border-[#1F2330] rounded-xl p-4 text-center text-sm font-medium text-[#3cff14] hover:border-[#3cff14] transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" /> Retake Assessment
      </button>
    </div>
  );
}

export default function PsychometricTestPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState('intro'); // intro | questions | submitting | results
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notSavedWarning, setNotSavedWarning] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await psychometricTestAPI.startTest();
      setQuestions(data.questions || []);
      setSessionId(data.session_id);
      setPhase('questions');
    } catch (e) {
      setError('Failed to start assessment. Please try again.');
      console.error('Start test failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (answers) => {
    setPhase('submitting');
    setError(null);
    setNotSavedWarning(false);
    try {
      const data = await psychometricTestAPI.submitTest({
        session_id: sessionId,
        answers,
      });
      setResult(data.result);
      setNotSavedWarning(data.saved === false);
      setPhase('results');
      // The dashboard radar chart reads the latest scores from the learner
      // profile, so refetch it to reflect this assessment's outcome.
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.data });
    } catch (e) {
      setError('Failed to submit assessment. Please try again.');
      setPhase('questions');
      console.error('Submit test failed:', e);
    }
  };

  const handleRetake = () => {
    setPhase('intro');
    setQuestions([]);
    setSessionId(null);
    setResult(null);
    setError(null);
    setNotSavedWarning(false);
  };

  return (
    <div className="min-h-screen bg-[#0D0F18]">
      {/* Header */}
      <header className="bg-[#0D0F18]/80 backdrop-blur-md border-b border-[#1F2330] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-[#A4ACBC] hover:text-[#3cff14] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-display font-bold text-[#3cff14] tracking-tight">
            Psychometric Test
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-900/20 border border-red-500/30 mb-6 animate-fade-in-up">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {phase === 'intro' && (
          <IntroScreen onStart={handleStart} loading={loading} />
        )}

        {phase === 'questions' && questions.length > 0 && (
          <QuestionStepper questions={questions} onComplete={handleComplete} />
        )}

        {phase === 'submitting' && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full border-2 border-[#3cff14] border-t-transparent animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-display font-bold text-white mb-2">Analyzing your responses</h3>
            <p className="text-[#A4ACBC]">Running the decision engine...</p>
          </div>
        )}

        {phase === 'results' && notSavedWarning && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-900/20 border border-amber-500/30 mb-6 animate-fade-in-up">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-300">
              <p className="font-semibold mb-0.5">Results not saved to your account</p>
              <p>You can still review them below, but they won't appear in your test history or profile. Sign in and retake to save them.</p>
            </div>
          </div>
        )}

        {phase === 'results' && (
          <ResultsView result={result} onRetake={handleRetake} />
        )}
      </main>
    </div>
  );
}
