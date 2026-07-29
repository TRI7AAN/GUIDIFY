/**
 * ResumeFeedback — Phase 1 completion component
 *
 * Displays parsed resume summary, extracted skills, experience,
 * resume score (0-100), gap analysis, ATS compatibility, and
 * top actionable improvements.
 *
 * Per remainingtasks.md §1.1: "Display parsed resume summary,
 * extracted skills, experience level, and actionable resume
 * score/gap analysis."
 *
 * Uses TailwindCSS design system.
 */

import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, TrendingUp, Shield,
  ChevronDown, ChevronUp, Briefcase, GraduationCap,
  Code2, User, ArrowUpRight, Target
} from 'lucide-react';

const SCORE_COLORS = {
  high: { ring: 'text-accent-500', bg: 'bg-accent-50', label: 'Strong' },
  mid: { ring: 'text-amber-500', bg: 'bg-amber-50', label: 'Decent' },
  low: { ring: 'text-rose-500', bg: 'bg-rose-50', label: 'Needs Work' },
};

function getScoreTier(score) {
  if (score >= 75) return SCORE_COLORS.high;
  if (score >= 50) return SCORE_COLORS.mid;
  return SCORE_COLORS.low;
}

function ScoreRing({ score }) {
  const tier = getScoreTier(score);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="40" cy="40" r="36" fill="none"
          className={tier.ring}
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-bold text-surface-900">{score}</span>
        <span className="text-[10px] font-medium text-surface-800/50">/ 100</span>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary-500" />
      <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
      {count != null && (
        <span className="text-[10px] bg-surface-100 text-surface-800/60 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

function SkillTag({ skill, type = 'tech' }) {
  const styles = type === 'tech'
    ? 'bg-primary-100 text-primary-700'
    : 'bg-violet-100 text-violet-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles}`}>
      {skill}
    </span>
  );
}

function GapItem({ gap }) {
  const impactStyles = {
    high: 'border-l-rose-400 bg-rose-50/50',
    medium: 'border-l-amber-400 bg-amber-50/50',
    low: 'border-l-surface-300 bg-surface-50',
  };
  return (
    <div className={`border-l-2 pl-3 py-2 rounded-r-lg ${impactStyles[gap.impact] || impactStyles.medium}`}>
      <p className="text-sm font-medium text-surface-900">{gap.area}</p>
      <p className="text-xs text-surface-800/60 mt-0.5">{gap.description}</p>
      {gap.suggestion && (
        <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> {gap.suggestion}
        </p>
      )}
    </div>
  );
}

function ImprovementItem({ item }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-50">
      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
        {item.priority}
      </span>
      <div>
        <p className="text-sm font-medium text-surface-900">{item.action}</p>
        {item.example && (
          <p className="text-xs text-surface-800/50 mt-1 italic">e.g. {item.example}</p>
        )}
      </div>
    </div>
  );
}

export default function ResumeFeedback({ data }) {
  const [expandedSections, setExpandedSections] = useState({
    skills: true,
    experience: true,
    education: false,
    gaps: true,
    improvements: true,
    ats: false,
  });

  if (!data) return null;

  const { parsed_data: parsed, gap_analysis: score, score: overallScore } = data;

  const toggle = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Score Hero */}
      <div className="glass-card p-6 flex items-center gap-6">
        <ScoreRing score={overallScore ?? 0} />
        <div className="flex-1">
          <h2 className="text-lg font-display font-bold text-surface-900 mb-1">
            Resume Score: {getScoreTier(overallScore ?? 0).label}
          </h2>
          <p className="text-sm text-surface-800/60">
            {overallScore >= 75
              ? 'Your resume is strong. Minor refinements can make it even better.'
              : overallScore >= 50
              ? 'Decent foundation. Address the gaps below to boost your score.'
              : 'Significant improvements needed. Focus on the top actions below.'}
          </p>
          {score?.section_scores && Object.keys(score.section_scores).length > 0 && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {Object.entries(score.section_scores).map(([section, s]) => (
                <div key={section} className="text-center">
                  <div className="text-xs text-surface-800/50 capitalize">{section.replace(/_/g, ' ')}</div>
                  <div className={`text-sm font-bold ${getScoreTier(s).ring}`}>{s}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Parsed Summary */}
      {parsed?.summary && (
        <div className="glass-card p-5">
          <SectionHeader icon={User} title="Professional Summary" />
          <p className="text-sm text-surface-800/70 leading-relaxed">{parsed.summary}</p>
          {parsed.total_years_experience > 0 && (
            <p className="text-xs text-surface-800/50 mt-2">
              {parsed.total_years_experience} years of experience
            </p>
          )}
        </div>
      )}

      {/* Skills */}
      {parsed && (parsed.technical_skills?.length > 0 || parsed.soft_skills?.length > 0) && (
        <div className="glass-card p-5">
          <button onClick={() => toggle('skills')} className="w-full flex items-center justify-between">
            <SectionHeader icon={Code2} title="Extracted Skills"
              count={(parsed.technical_skills?.length || 0) + (parsed.soft_skills?.length || 0)} />
            {expandedSections.skills ? <ChevronUp className="w-4 h-4 text-surface-800/40" /> : <ChevronDown className="w-4 h-4 text-surface-800/40" />}
          </button>
          {expandedSections.skills && (
            <div className="mt-2 space-y-3 animate-fade-in-up">
              {parsed.technical_skills?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-surface-800/40 uppercase tracking-wider mb-1.5">Technical</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.technical_skills.map((s, i) => <SkillTag key={i} skill={s} type="tech" />)}
                  </div>
                </div>
              )}
              {parsed.soft_skills?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-surface-800/40 uppercase tracking-wider mb-1.5">Soft Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.soft_skills.map((s, i) => <SkillTag key={i} skill={s} type="soft" />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Experience */}
      {parsed?.experience?.length > 0 && (
        <div className="glass-card p-5">
          <button onClick={() => toggle('experience')} className="w-full flex items-center justify-between">
            <SectionHeader icon={Briefcase} title="Work Experience" count={parsed.experience.length} />
            {expandedSections.experience ? <ChevronUp className="w-4 h-4 text-surface-800/40" /> : <ChevronDown className="w-4 h-4 text-surface-800/40" />}
          </button>
          {expandedSections.experience && (
            <div className="mt-2 space-y-3 animate-fade-in-up">
              {parsed.experience.map((exp, i) => (
                <div key={i} className="pl-3 border-l-2 border-surface-200">
                  <p className="text-sm font-semibold text-surface-900">{exp.title}</p>
                  <p className="text-xs text-surface-800/60">{exp.company} {exp.start_date && `· ${exp.start_date} - ${exp.end_date || 'Present'}`}</p>
                  {exp.description && <p className="text-xs text-surface-800/70 mt-1">{exp.description}</p>}
                  {exp.responsibilities?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {exp.responsibilities.map((r, j) => (
                        <li key={j} className="text-xs text-surface-800/60 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Education */}
      {parsed?.education?.length > 0 && (
        <div className="glass-card p-5">
          <button onClick={() => toggle('education')} className="w-full flex items-center justify-between">
            <SectionHeader icon={GraduationCap} title="Education" count={parsed.education.length} />
            {expandedSections.education ? <ChevronUp className="w-4 h-4 text-surface-800/40" /> : <ChevronDown className="w-4 h-4 text-surface-800/40" />}
          </button>
          {expandedSections.education && (
            <div className="mt-2 space-y-2 animate-fade-in-up">
              {parsed.education.map((edu, i) => (
                <div key={i} className="pl-3 border-l-2 border-surface-200">
                  <p className="text-sm font-semibold text-surface-900">{edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}</p>
                  <p className="text-xs text-surface-800/60">{edu.institution} {edu.end_date && `· ${edu.end_date}`}</p>
                  {edu.gpa && <p className="text-xs text-surface-800/50 mt-0.5">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gap Analysis */}
      {score?.gaps?.length > 0 && (
        <div className="glass-card p-5">
          <button onClick={() => toggle('gaps')} className="w-full flex items-center justify-between">
            <SectionHeader icon={AlertTriangle} title="Gap Analysis" count={score.gaps.length} />
            {expandedSections.gaps ? <ChevronUp className="w-4 h-4 text-surface-800/40" /> : <ChevronDown className="w-4 h-4 text-surface-800/40" />}
          </button>
          {expandedSections.gaps && (
            <div className="mt-2 space-y-2 animate-fade-in-up">
              {score.gaps.map((gap, i) => <GapItem key={i} gap={gap} />)}
            </div>
          )}
        </div>
      )}

      {/* Top Improvements */}
      {score?.top_improvements?.length > 0 && (
        <div className="glass-card p-5">
          <button onClick={() => toggle('improvements')} className="w-full flex items-center justify-between">
            <SectionHeader icon={TrendingUp} title="Top Improvements" count={score.top_improvements.length} />
            {expandedSections.improvements ? <ChevronUp className="w-4 h-4 text-surface-800/40" /> : <ChevronDown className="w-4 h-4 text-surface-800/40" />}
          </button>
          {expandedSections.improvements && (
            <div className="mt-2 space-y-2 animate-fade-in-up">
              {score.top_improvements.map((item, i) => <ImprovementItem key={i} item={item} />)}
            </div>
          )}
        </div>
      )}

      {/* ATS Compatibility */}
      {score?.ats_compatibility && (
        <div className="glass-card p-5">
          <button onClick={() => toggle('ats')} className="w-full flex items-center justify-between">
            <SectionHeader icon={Shield} title="ATS Compatibility" count={`${score.ats_compatibility.score}%`} />
            {expandedSections.ats ? <ChevronUp className="w-4 h-4 text-surface-800/40" /> : <ChevronDown className="w-4 h-4 text-surface-800/40" />}
          </button>
          {expandedSections.ats && (
            <div className="mt-2 space-y-3 animate-fade-in-up">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-surface-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreTier(score.ats_compatibility.score).ring.replace('text-', 'bg-')}`}
                    style={{ width: `${score.ats_compatibility.score}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-surface-900">{score.ats_compatibility.score}%</span>
              </div>
              {score.ats_compatibility.issues?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-surface-800/40 uppercase tracking-wider mb-1">Issues</p>
                  <ul className="space-y-1">
                    {score.ats_compatibility.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-rose-600 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {score.ats_compatibility.suggestions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-surface-800/40 uppercase tracking-wider mb-1">Suggestions</p>
                  <ul className="space-y-1">
                    {score.ats_compatibility.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-primary-600 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strengths */}
      {score?.strengths?.length > 0 && (
        <div className="glass-card p-5">
          <SectionHeader icon={CheckCircle2} title="Strengths" count={score.strengths.length} />
          <ul className="mt-2 space-y-1.5">
            {score.strengths.map((s, i) => (
              <li key={i} className="text-sm text-surface-800/70 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
