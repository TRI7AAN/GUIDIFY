import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, missionsAPI } from '../lib/api';
import MissionCard from '../components/dashboard/MissionCard';
import {
  Flame, TrendingUp, BookOpen, BarChart3, Target,
  Rocket, FileText, MessageSquare, ChevronRight, Sparkles,
  PieChart, Layers, Activity
} from 'lucide-react';

const TRAIT_LABELS = ['Technical', 'Creative', 'Communication', 'Leadership', 'Analytical'];

function RadarChart({ scores }) {
  const cx = 100, cy = 100, r = 65; // Slightly reduced radius to fit labels
  const n = TRAIT_LABELS.length;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const getPoint = (i, val) => ({
    x: cx + r * (val / 100) * Math.cos(angle(i)),
    y: cy + r * (val / 100) * Math.sin(angle(i)),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = (scores || [75, 60, 80, 50, 90]).map((s, i) => getPoint(i, s));
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level * 100);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="#1F2330"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <line key={i} x1={cx} y1={cy} x2={getPoint(i, 100).x} y2={getPoint(i, 100).y} stroke="#1F2330" strokeWidth="1" />
      ))}
      <polygon points={polygonPoints} fill="rgba(60,255,20,0.15)" stroke="#3cff14" strokeWidth="1.5" />
      {TRAIT_LABELS.map((label, i) => {
        const p = getPoint(i, 125); // Push labels a bit further out
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize="7.5" fontFamily="Space Grotesk">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function HeatmapCell({ date, active }) {
  return (
    <div className={`flex items-center justify-center w-8 h-8 rounded text-[10px] font-bold ${active ? 'bg-[#3cff14] text-[#0D0F18]' : 'bg-[#151821] text-[#A4ACBC] border border-[#1F2330]'}`}>
      {date}
    </div>
  );
}

function ProgressBar({ value, color = 'bg-[#3cff14]' }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-full bg-[#1F2330] rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-white font-bold text-sm whitespace-nowrap">{value}%</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#3cff14] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#A4ACBC] font-medium font-display">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const streakDays = dashboard?.streak_days ?? 0;
  const interviewReadiness = dashboard?.interview_readiness ?? 0;
  const placementReadiness = dashboard?.placement_readiness ?? 0;

  // Personality trait scores from psychometric analysis
  const traitScores = dashboard?.category_scores;
  const skillScores = traitScores
    ? TRAIT_LABELS.map(t => traitScores[t] ?? 50)
    : [75, 60, 80, 50, 90];

  // Heatmap dates
  const heatmapDates = [
    { date: 29, active: true },
    { date: 30, active: false },
    { date: 31, active: false },
    { date: 1, active: true },
    { date: 2, active: false },
    { date: 3, active: false },
    { date: 4, active: false },
    { date: 5, active: false },
    { date: 6, active: true },
  ];

  const learningPathSteps = [
    { title: 'Step 1: Data Fundamentals', desc: 'Learn the basics of data structures and algorithms.', icon: BarChart3, status: 'active' },
    { title: 'Step 2: Intro to Machine Learning', desc: 'Explore foundational ML concepts and models.', icon: Sparkles, status: 'locked' },
    { title: 'Step 3: Neural Networks', desc: 'Dive deep into the architecture of neural networks.', icon: Target, status: 'locked' },
  ];

  const courses = [
    { title: 'Advanced Python for AI', level: 'NSQF Level 5', color: 'from-[#3cff14]/20 to-[#3cff14]/5' },
    { title: 'Data Visualization with D3.js', level: 'NSQF Level 6', color: 'from-[#4AD8E6]/20 to-[#4AD8E6]/5' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-white text-2xl font-bold tracking-tight font-display">Welcome back, {firstName}!</p>
          <p className="text-[#A4ACBC] text-xs">Here is your progress and recommendations for today.</p>
        </div>
      </div>

      {/* Stats Cards + Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Skills Radar (Spans 2 columns) */}
        <div className="lg:col-span-2 p-6 bg-[#151821] border border-[#3cff14]/50 rounded-xl flex flex-col relative min-h-[400px]">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-[#A4ACBC]" />
            <h3 className="text-[#A4ACBC] text-[11px] font-bold tracking-widest uppercase">Skills Radar</h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center pt-4">
            <h4 className="text-[#3cff14] text-sm mb-8 font-medium">Personality Profile</h4>
            <div className="w-full max-w-[320px] aspect-square">
              <RadarChart scores={skillScores} />
            </div>
          </div>
        </div>

        {/* Right Column Stack */}
        <div className="flex flex-col gap-5">
          {/* Login Streak */}
          <div className="flex flex-col gap-1 rounded-xl p-5 bg-[#151821] border border-[#1F2330]">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-[#ff4b4b]" />
              <p className="text-[#A4ACBC] text-[11px] font-bold tracking-widest uppercase">Login Streak</p>
            </div>
            <p className="text-white text-3xl font-bold">{streakDays || 12} Days</p>
            <p className="text-[#3cff14] text-xs font-medium mt-1">
              +2% from last week
            </p>
          </div>

          {/* Tier Progress */}
          <div className="flex flex-col gap-1 rounded-xl p-5 bg-[#151821] border border-[#1F2330]">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-[#4AD8E6]" />
              <p className="text-[#A4ACBC] text-[11px] font-bold tracking-widest uppercase">Tier Progress</p>
            </div>
            <p className="text-white text-3xl font-bold">Expert II</p>
            <p className="text-[#3cff14] text-xs font-medium mt-1 mb-4">
              +65% towards Master I
            </p>
            <div className="w-full bg-[#1F2330] rounded-full h-1.5">
              <div className="bg-[#4AD8E6] h-1.5 rounded-full" style={{ width: `65%` }} />
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="p-5 bg-[#151821] border border-[#1F2330] rounded-xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#3cff14]" />
                <h3 className="text-[#A4ACBC] text-[11px] font-bold tracking-widest uppercase">Activity Heatmap</h3>
              </div>
              <span className="text-[#A4ACBC] text-[10px]">November 2025</span>
            </div>
            <div className="flex items-center justify-between gap-1 w-full">
              {heatmapDates.map((item, i) => (
                <HeatmapCell key={i} date={item.date} active={item.active} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Trackers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-4">
          <p className="text-[#A4ACBC] text-xs mb-1.5">Learning Path Completion</p>
          <ProgressBar value={dashboard?.roadmap_progress_pct ?? 45} />
        </div>
        <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-4">
          <p className="text-[#A4ACBC] text-xs mb-1.5">Skills Mastery</p>
          <ProgressBar value={68} color="bg-[#4AD8E6]" />
        </div>
        <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-4">
          <p className="text-[#A4ACBC] text-xs mb-1.5">Career Readiness</p>
          <ProgressBar value={placementReadiness || 30} />
        </div>
      </div>

      {/* Today's Mission */}
      {mission && !mission.error && (
        <section>
          <MissionCard
            mission={mission}
            onStatusChange={(updatedMission, newStreak) => {
              setMission(updatedMission);
              if (newStreak !== undefined && dashboard) {
                setDashboard({ ...dashboard, streak_days: newStreak });
              }
            }}
          />
        </section>
      )}

      {/* Personalized Learning Path */}
      <div>
        <h2 className="text-white text-lg font-bold tracking-tight mb-3 font-display">Personalized Learning Path</h2>
        <div className="flex gap-4 overflow-x-auto pb-3 -mx-6 px-6">
          {learningPathSteps.map((step, i) => {
            const Icon = step.icon;
            const isLocked = step.status === 'locked';
            return (
              <div key={i} className={`flex-shrink-0 w-72 bg-[#151821] border border-[#1F2330] rounded-xl p-4 flex flex-col items-start gap-3 ${isLocked ? 'opacity-70' : ''}`}>
                <div className={`${isLocked ? 'bg-[#4AD8E6]/10 text-[#4AD8E6]' : 'bg-[#3cff14]/10 text-[#3cff14]'} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-sm">{step.title}</h3>
                <p className="text-[#A4ACBC] text-xs">{step.desc}</p>
                <button
                  onClick={() => !isLocked && navigate('/roadmap')}
                  disabled={isLocked}
                  className={`mt-auto w-full text-center rounded-lg py-1.5 text-sm font-bold transition-colors ${
                    isLocked
                      ? 'bg-[#1F2330] text-[#A4ACBC] cursor-not-allowed'
                      : 'bg-[#3cff14] text-[#0D0F18] hover:opacity-80'
                  }`}
                >
                  {isLocked ? 'Locked' : 'Start Module'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/resume')}
          className="bg-[#151821] border border-[#1F2330] rounded-xl p-3.5 text-left group hover:border-[#3cff14] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3cff14]/10 flex items-center justify-center group-hover:bg-[#3cff14]/20 transition-colors">
              <FileText className="w-4 h-4 text-[#3cff14]" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Resume Analysis</p>
              <p className="text-[10px] text-[#A4ACBC]">Upload your resume for AI-powered feedback</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#1F2330] ml-auto group-hover:text-[#3cff14] transition-colors" />
          </div>
        </button>

        <button
          onClick={() => navigate('/interview')}
          className="bg-[#151821] border border-[#1F2330] rounded-xl p-3.5 text-left group hover:border-[#4AD8E6] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4AD8E6]/10 flex items-center justify-center group-hover:bg-[#4AD8E6]/20 transition-colors">
              <MessageSquare className="w-4 h-4 text-[#4AD8E6]" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Practice Interview</p>
              <p className="text-[10px] text-[#A4ACBC]">AI-powered mock interview with feedback</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#1F2330] ml-auto group-hover:text-[#4AD8E6] transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
}
