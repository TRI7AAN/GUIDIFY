/**
 * Interview Page — design.md §2.5
 * 
 * Phase 4 placeholder with coming-soon state.
 * Shows what the interview bot will offer when implemented.
 * 
 * Uses TailwindCSS design system.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, ChevronLeft, Mic, Brain, FileText,
  BarChart3, Sparkles, Lock
} from 'lucide-react';

export default function InterviewPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: 'Adaptive Questions',
      description: 'AI generates follow-up questions based on your answers and target role.',
      color: 'primary',
    },
    {
      icon: Mic,
      title: 'Voice & Text Input',
      description: 'Practice with speech-to-text or type your answers.',
      color: 'accent',
    },
    {
      icon: FileText,
      title: 'STAR Method Coach',
      description: 'Get feedback on structure, technical accuracy, and communication.',
      color: 'primary',
    },
    {
      icon: BarChart3,
      title: 'Performance Report',
      description: 'Detailed evaluation with Technical Readiness %, strengths, and growth areas.',
      color: 'accent',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-display font-bold text-primary-700 tracking-tight">
            AI Interview Coach
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-6 relative">
            <MessageSquare className="w-10 h-10 text-primary-500" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock className="w-3 h-3 text-amber-600" />
            </div>
          </div>
          <h2 className="text-3xl font-display font-bold text-surface-900 mb-3">
            Mock Interview Bot
          </h2>
          <p className="text-surface-800/60 max-w-lg mx-auto mb-6">
            Practice technical and HR interviews with AI-powered coaching. 
            Get real-time feedback on your answers and improve your interview readiness.
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
            <Sparkles className="w-4 h-4" />
            Coming in Phase 4
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, i) => (
            <div
              key={i}
              className="glass-card p-6 animate-fade-in-up opacity-80"
              style={{ animationDelay: `${0.1 + i * 0.05}s` }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                feature.color === 'primary' ? 'bg-primary-100' : 'bg-accent-100'
              }`}>
                <feature.icon className={`w-5 h-5 ${
                  feature.color === 'primary' ? 'text-primary-500' : 'text-accent-500'
                }`} />
              </div>
              <h3 className="font-display font-semibold text-surface-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-surface-800/60">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
