/**
 * Dashboard — design.md §2.2
 * 
 * Layout:
 *   Hero zone:      Today's Mission card — title, estimated time, "Start" CTA
 *   Secondary zone: Current phase name + slim progress bar
 *   Tertiary zone:  Streak counter, readiness scores, quick links
 * 
 * Per design.md §1: "One clear next action, always."
 * The dashboard leads with Today's Mission, not a wall of options.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, missionsAPI } from '../lib/api';
import MissionCard from '../components/dashboard/MissionCard';
import {
  Rocket, Target, Flame, TrendingUp, FileText,
  MessageSquare, ChevronRight, Clock, Sparkles, BarChart3
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Learner';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashData, missionData] = await Promise.allSettled([
          dashboardAPI.get(),
          missionsAPI.getToday(),
        ]);

        if (dashData.status === 'fulfilled') setDashboard(dashData.value);
        if (missionData.status === 'fulfilled' && !missionData.value?.error) {
          setMission(missionData.value);
        }
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-surface-800 font-medium font-display">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const streakDays = dashboard?.streak_days ?? 0;
  const currentPhase = dashboard?.current_phase ?? null;
  const progressPct = dashboard?.roadmap_progress_pct ?? 0;
  const interviewReadiness = dashboard?.interview_readiness ?? 0;
  const placementReadiness = dashboard?.placement_readiness ?? 0;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ── Top Bar ──────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-primary-700 tracking-tight">
            GUIDIFY
          </h1>
          <nav className="flex items-center gap-6">
            <button
              onClick={() => navigate('/roadmap')}
              className="text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors focus-ring rounded-lg px-2 py-1"
            >
              Roadmap
            </button>
            <button
              onClick={() => navigate('/resume')}
              className="text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors focus-ring rounded-lg px-2 py-1"
            >
              Resume
            </button>
            <button
              onClick={() => navigate('/interview')}
              className="text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors focus-ring rounded-lg px-2 py-1"
            >
              Interview
            </button>
            <div className="w-px h-6 bg-surface-200" />
            <button
              onClick={handleLogout}
              className="text-sm text-surface-800 hover:text-danger transition-colors focus-ring rounded-lg px-2 py-1"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Greeting ───────────────────────────────────── */}
        <div className="mb-8 animate-fade-in-up">
          <h2 className="text-3xl font-display font-bold text-surface-900 mb-1">
            Welcome back, {firstName}
          </h2>
          <p className="text-surface-800/70">
            {currentPhase
              ? `You're on "${currentPhase}" — keep going.`
              : 'Your personalized career journey starts here.'}
          </p>
        </div>

        {/* ── HERO ZONE: Today's Mission ─────────────────── */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {mission && !mission.error ? (
            <MissionCard
              mission={mission}
              onStatusChange={(updatedMission, newStreak) => {
                setMission(updatedMission);
                if (newStreak !== undefined && dashboard) {
                  setDashboard({ ...dashboard, streak_days: newStreak });
                }
              }}
            />
          ) : (
            /* Empty state — design.md §3: suggest the next concrete step */
            <div className="glass-card p-8 text-center">
              <Sparkles className="w-10 h-10 text-primary-400 mx-auto mb-3" />
              <h3 className="text-lg font-display font-semibold text-surface-900 mb-2">
                No mission yet
              </h3>
              <p className="text-surface-800/60 text-sm mb-4 max-w-md mx-auto">
                {currentPhase
                  ? 'Your next mission is being prepared. Check back soon!'
                  : 'Complete your profile and generate a roadmap to unlock daily missions.'}
              </p>
              {!currentPhase && (
                <button
                  onClick={() => navigate('/onboarding')}
                  className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity focus-ring"
                >
                  Complete Profile
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── SECONDARY ZONE: Phase Progress ─────────────── */}
        {currentPhase && (
          <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent-500" />
                  <span className="text-sm font-semibold text-surface-900">
                    {currentPhase}
                  </span>
                </div>
                <span className="text-sm font-bold text-primary-600">{progressPct}%</span>
              </div>
              <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full gradient-accent rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-surface-800/50">Phase progress</span>
                <button
                  onClick={() => navigate('/roadmap')}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
                >
                  View Roadmap <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── TERTIARY ZONE: Stats + Quick Links ─────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Streak */}
          <div className="glass-card card-hover p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-surface-800/60 font-medium">Streak</p>
                <p className="text-2xl font-display font-bold text-surface-900">{streakDays}</p>
              </div>
            </div>
            <p className="text-xs text-surface-800/50">
              {streakDays > 0 ? `${streakDays} day${streakDays !== 1 ? 's' : ''} of learning!` : 'Start your streak today'}
            </p>
          </div>

          {/* Interview Readiness */}
          <div className="glass-card card-hover p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="text-xs text-surface-800/60 font-medium">Interview Readiness</p>
                <p className="text-2xl font-display font-bold text-surface-900">{interviewReadiness}%</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/interview')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
            >
              Practice Interview <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Placement Readiness */}
          <div className="glass-card card-hover p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-500" />
              </div>
              <div>
                <p className="text-xs text-surface-800/60 font-medium">Placement Ready</p>
                <p className="text-2xl font-display font-bold text-surface-900">{placementReadiness}%</p>
              </div>
            </div>
            <p className="text-xs text-surface-800/50">
              {/* rules.md §6: readiness is a guidance signal, not a guarantee */}
              Guidance estimate based on your progress
            </p>
          </div>
        </section>

        {/* ── Quick Actions ──────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <button
            onClick={() => navigate('/resume')}
            className="glass-card card-hover p-5 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-surface-900">Resume Analysis</p>
                <p className="text-xs text-surface-800/60">Upload your resume for AI-powered feedback</p>
              </div>
              <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => navigate('/roadmap')}
            className="glass-card card-hover p-5 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center group-hover:bg-accent-200 transition-colors">
                <BarChart3 className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <p className="font-semibold text-surface-900">View Roadmap</p>
                <p className="text-xs text-surface-800/60">See your personalized learning path</p>
              </div>
              <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-accent-500 transition-colors" />
            </div>
          </button>
        </section>
      </main>
    </div>
  );
}
