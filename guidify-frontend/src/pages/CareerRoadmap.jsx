/**
 * Roadmap View — design.md §2.3
 * 
 * Full-screen interactive roadmap visualization showing:
 *   - All phases with skills, difficulty, estimated weeks
 *   - Current active phase highlighting
 *   - Phase expansion with milestones
 *   - Regenerate roadmap action
 * 
 * Uses /api/v1/roadmap/current per api.md §3.
 * TailwindCSS styling per design system.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roadmapAPI } from '../lib/api';
import {
  Map, ChevronDown, ChevronRight, ChevronLeft, Clock,
  Target, Sparkles, CheckCircle2, Circle, Lock,
  BookOpen, Zap, Trophy, ArrowRight, RefreshCw
} from 'lucide-react';

export default function RoadmapView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        const data = await roadmapAPI.getCurrent();
        if (data && data.status !== 'no_roadmap') {
          setRoadmap(data);
          // Auto-expand current phase
          setExpandedPhase(data.current_phase_number || 1);
        }
      } catch (e) {
        console.error('Roadmap fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchRoadmap();
  }, [user]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await roadmapAPI.regenerate();
      if (res?.status === 'ok') {
        // Refetch the full roadmap
        const data = await roadmapAPI.getCurrent();
        if (data && data.status !== 'no_roadmap') {
          setRoadmap(data);
          setExpandedPhase(data.current_phase_number || 1);
        }
      }
    } catch (e) {
      console.error('Regenerate failed:', e);
    } finally {
      setRegenerating(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
      case 'intermediate': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
      case 'advanced': return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' };
      default: return { bg: 'bg-surface-200', text: 'text-surface-800', dot: 'bg-surface-300' };
    }
  };

  const getPhaseStatus = (phaseNumber) => {
    const current = roadmap?.current_phase_number || 1;
    if (phaseNumber < current) return 'completed';
    if (phaseNumber === current) return 'active';
    return 'locked';
  };

  const getPhaseIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-accent-500" />;
      case 'active': return <Zap className="w-5 h-5 text-primary-500" />;
      case 'locked': return <Lock className="w-5 h-5 text-surface-300" />;
      default: return <Circle className="w-5 h-5 text-surface-300" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-surface-800 font-medium font-display">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  // No roadmap state
  if (!roadmap) {
    return (
      <div className="min-h-screen bg-surface-50">
        <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </button>
            <h1 className="text-xl font-display font-bold text-primary-700 tracking-tight">
              Career Roadmap
            </h1>
            <div className="w-20" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-20 text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-6">
            <Map className="w-10 h-10 text-primary-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-surface-900 mb-3">
            No Roadmap Yet
          </h2>
          <p className="text-surface-800/60 mb-8 max-w-md mx-auto">
            Complete your profile to get a personalized career roadmap powered by AI.
            Your roadmap will break down the journey into clear, actionable phases.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/onboarding')}
              className="gradient-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity focus-ring"
            >
              Complete Profile
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="bg-white border border-surface-200 text-surface-800 font-semibold px-6 py-3 rounded-xl hover:bg-surface-100 transition-colors focus-ring flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Generating...' : 'Generate Roadmap'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const phases = roadmap.phases || [];
  const currentPhaseNumber = roadmap.current_phase_number || 1;
  const progressPct = roadmap.progress_pct || 0;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-display font-bold text-primary-700 tracking-tight">
            Career Roadmap
          </h1>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors focus-ring rounded-lg px-2 py-1"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* ── Roadmap Header ────────────────────────────── */}
        <div className="mb-8 animate-fade-in-up">
          <h2 className="text-3xl font-display font-bold text-surface-900 mb-2">
            {roadmap.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-surface-800/60">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              {roadmap.total_phases} phases
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              ~{roadmap.estimated_weeks} weeks
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Version {roadmap.version || 1}
            </span>
          </div>
        </div>

        {/* ── Overall Progress ──────────────────────────── */}
        <div className="glass-card p-5 mb-8 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-surface-900">Overall Progress</span>
            <span className="text-sm font-bold text-primary-600">{progressPct}%</span>
          </div>
          <div className="w-full h-3 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full gradient-accent rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-surface-800/50 mt-2">
            Phase {currentPhaseNumber} of {roadmap.total_phases}
          </p>
        </div>

        {/* ── Phase Timeline ─────────────────────────────── */}
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const status = getPhaseStatus(phase.phase_number);
            const isExpanded = expandedPhase === phase.phase_number;
            const diffColor = getDifficultyColor(phase.difficulty);

            return (
              <div
                key={phase.phase_number}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              >
                {/* Phase Card */}
                <button
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.phase_number)}
                  className={`
                    w-full text-left glass-card p-5 transition-all duration-200
                    ${status === 'active' ? 'border-l-4 border-l-primary-500 shadow-lg shadow-primary-500/5' : ''}
                    ${status === 'completed' ? 'border-l-4 border-l-accent-500' : ''}
                    ${status === 'locked' ? 'opacity-75' : 'card-hover'}
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Timeline node */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${status === 'active' ? 'bg-primary-100' : ''}
                        ${status === 'completed' ? 'bg-accent-100' : ''}
                        ${status === 'locked' ? 'bg-surface-200' : ''}
                      `}>
                        {getPhaseIcon(status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-display font-semibold text-surface-900">
                            {phase.title}
                          </h3>
                          {status === 'active' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                          {status === 'completed' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
                              Done
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-surface-800/60 line-clamp-2">
                          {phase.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${diffColor.bg} ${diffColor.text}`}>
                          {phase.difficulty}
                        </span>
                        <span className="text-xs text-surface-800/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {phase.estimated_weeks}w
                        </span>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="w-5 h-5 text-surface-300" />
                        : <ChevronRight className="w-5 h-5 text-surface-300" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="ml-5 border-l-2 border-surface-200 pl-5 py-4 space-y-4 animate-fade-in-up">
                    {/* Skills */}
                    <div>
                      <h4 className="text-xs font-semibold text-surface-800/50 uppercase tracking-wider mb-2">
                        Skills to Learn
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(phase.skills || []).map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs font-medium bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Milestones */}
                    {phase.milestones && phase.milestones.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-surface-800/50 uppercase tracking-wider mb-2">
                          Milestones
                        </h4>
                        <ul className="space-y-2">
                          {phase.milestones.map((milestone, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-surface-800/70">
                              <Trophy className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                              {milestone}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Phase meta */}
                    <div className="flex items-center gap-4 pt-2 border-t border-surface-200">
                      <span className="text-xs text-surface-800/50 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {phase.estimated_weeks} week{phase.estimated_weeks !== 1 ? 's' : ''}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diffColor.bg} ${diffColor.text}`}>
                        {phase.difficulty}
                      </span>
                      <span className="text-xs text-surface-800/50">
                        {(phase.skills || []).length} skills
                      </span>
                    </div>
                  </div>
                )}

                {/* Connector line between phases */}
                {index < phases.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className={`w-0.5 h-4 ${
                      status === 'completed' ? 'bg-accent-300' : 'bg-surface-200'
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
