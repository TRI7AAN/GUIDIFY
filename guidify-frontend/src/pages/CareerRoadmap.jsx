import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentRoadmap, useRegenerateRoadmap } from '../hooks/query';
import {
  Map, ChevronDown, ChevronRight, ChevronLeft, Clock,
  Target, Sparkles, CheckCircle2, Circle, Lock,
  BookOpen, Zap, Trophy, ArrowRight, RefreshCw
} from 'lucide-react';

export default function RoadmapView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedPhase, setExpandedPhase] = useState(null);
  
  const { data: roadmapData, isLoading: loading, isError } = useCurrentRoadmap({
    enabled: !!user,
  });

  const regenerateMutation = useRegenerateRoadmap();
  const regenerating = regenerateMutation.isPending;

  const handleRegenerate = () => {
    regenerateMutation.mutate();
  };

  // Handle the no_roadmap status from backend
  const roadmap = roadmapData?.status === 'no_roadmap' ? null : roadmapData;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-12 h-12 rounded-full border-2 border-[#3cff14] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#A4ACBC] font-medium font-display">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-12 h-12 rounded-full border-2 border-[#ff4b4b] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#A4ACBC] font-medium font-display">Failed to load your roadmap</p>
        </div>
      </div>
    );
  }

  // No roadmap state
  if (!roadmap) {
    return (
      <div className="min-h-screen bg-[#0D0F18]">
        <header className="bg-[#0D0F18]/80 backdrop-blur-md border-b border-[#1F2330] sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm font-medium text-[#A4ACBC] hover:text-[#3cff14] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </button>
            <h1 className="text-xl font-display font-bold text-[#3cff14] tracking-tight">
              Career Roadmap
            </h1>
            <div className="w-20" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-20 text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-2xl bg-[#3cff14]/10 flex items-center justify-center mx-auto mb-6">
            <Map className="w-10 h-10 text-[#3cff14]" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-3">
            No Roadmap Yet
          </h2>
          <p className="text-[#A4ACBC] mb-8 max-w-md mx-auto">
            Complete your profile to get a personalized career roadmap powered by AI.
            Your roadmap will break down the journey into clear, actionable phases.
          </p>

          {regenerateMutation.isError && (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-red-900/20 border border-red-500/30 mb-6 text-left">
              <p className="text-sm text-red-300">
                {regenerateMutation.error?.response?.data?.detail || 'Roadmap generation failed. Please try again.'}
              </p>
            </div>
          )}

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
              className="bg-[#151821] border border-[#1F2330] text-[#A4ACBC] font-semibold px-6 py-3 rounded-xl hover:bg-[#1F2330] transition-colors focus-ring flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Generating...' : 'Generate Roadmap'}
            </button>
          </div>
        </main>
      </div>
    );
  }


  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', dot: 'bg-emerald-500' };
      case 'intermediate': return { bg: 'bg-amber-900/30', text: 'text-amber-400', dot: 'bg-amber-500' };
      case 'advanced': return { bg: 'bg-rose-900/30', text: 'text-rose-400', dot: 'bg-rose-500' };
      default: return { bg: 'bg-[#1F2330]', text: 'text-[#A4ACBC]', dot: 'bg-[#A4ACBC]' };
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

  const phases = roadmap.phases || [];
  const currentPhaseNumber = roadmap.current_phase_number || 1;
  const progressPct = roadmap.progress_pct || 0;

  return (
    <div className="min-h-screen bg-[#0D0F18]">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <header className="bg-[#0D0F18]/80 backdrop-blur-md border-b border-[#1F2330] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-[#A4ACBC] hover:text-[#3cff14] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-display font-bold text-[#3cff14] tracking-tight">
            Career Roadmap
          </h1>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 text-sm font-medium text-[#A4ACBC] hover:text-[#3cff14] transition-colors focus-ring rounded-lg px-2 py-1"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* ── Roadmap Header ────────────────────────────── */}
        <div className="mb-8 animate-fade-in-up">
          <h2 className="text-3xl font-display font-bold text-white mb-2">
            {roadmap.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#A4ACBC]">
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
        <div className="bg-[#151821] border border-[#1F2330] p-5 mb-8 animate-fade-in-up rounded-xl" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Overall Progress</span>
            <span className="text-sm font-bold text-[#3cff14]">{progressPct}%</span>
          </div>
          <div className="w-full h-3 bg-[#1F2330] rounded-full overflow-hidden">
            <div
              className="h-full gradient-accent rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-[#A4ACBC] mt-2">
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
                    w-full text-left bg-[#151821] border border-[#1F2330] p-5 rounded-xl transition-all duration-200
                    ${status === 'active' ? 'border-l-4 border-l-[#3cff14] shadow-lg shadow-[#3cff14]/5' : ''}
                    ${status === 'completed' ? 'border-l-4 border-l-[#4AD8E6]' : ''}
                    ${status === 'locked' ? 'opacity-75' : 'hover:border-[#3cff14]/30'}
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Timeline node */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${status === 'active' ? 'bg-[#3cff14]/10' : ''}
                        ${status === 'completed' ? 'bg-[#4AD8E6]/10' : ''}
                        ${status === 'locked' ? 'bg-[#1F2330]' : ''}
                      `}>
                        {getPhaseIcon(status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-display font-semibold text-white">
                            {phase.title}
                          </h3>
                          {status === 'active' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3cff14] bg-[#3cff14]/10 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                          {status === 'completed' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4AD8E6] bg-[#4AD8E6]/10 px-2 py-0.5 rounded-full">
                              Done
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#A4ACBC] line-clamp-2">
                          {phase.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${diffColor.bg} ${diffColor.text}`}>
                          {phase.difficulty}
                        </span>
                        <span className="text-xs text-[#A4ACBC] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {phase.estimated_weeks}w
                        </span>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="w-5 h-5 text-[#A4ACBC]" />
                        : <ChevronRight className="w-5 h-5 text-[#A4ACBC]" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="ml-5 border-l-2 border-[#1F2330] pl-5 py-4 space-y-4 animate-fade-in-up">
                    {/* Skills */}
                    <div>
                      <h4 className="text-xs font-semibold text-[#A4ACBC] uppercase tracking-wider mb-2">
                        Skills to Learn
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(phase.skills || []).map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs font-medium bg-[#3cff14]/10 text-[#3cff14] px-3 py-1.5 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Milestones */}
                    {phase.milestones && phase.milestones.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-[#A4ACBC] uppercase tracking-wider mb-2">
                          Milestones
                        </h4>
                        <ul className="space-y-2">
                          {phase.milestones.map((milestone, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[#A4ACBC]">
                              <Trophy className="w-4 h-4 text-[#4AD8E6] shrink-0 mt-0.5" />
                              {milestone}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Phase meta */}
                    <div className="flex items-center gap-4 pt-2 border-t border-[#1F2330]">
                      <span className="text-xs text-[#A4ACBC] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {phase.estimated_weeks} week{phase.estimated_weeks !== 1 ? 's' : ''}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diffColor.bg} ${diffColor.text}`}>
                        {phase.difficulty}
                      </span>
                      <span className="text-xs text-[#A4ACBC]">
                        {(phase.skills || []).length} skills
                      </span>
                    </div>
                  </div>
                )}

                {/* Connector line between phases */}
                {index < phases.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className={`w-0.5 h-4 ${
                      status === 'completed' ? 'bg-[#4AD8E6]/50' : 'bg-[#1F2330]'
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