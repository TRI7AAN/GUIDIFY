/**
 * MissionCard — Dashboard hero zone component
 * 
 * Displays today's daily mission with:
 *   - Title, objective, target skill, time estimate
 *   - Step-by-step breakdown (expandable)
 *   - Resource links
 *   - Action buttons: Start, Complete, Skip, Mark Failed
 * 
 * Per design.md §2.2: "One clear next action, always."
 */

import React, { useState } from 'react';
import { missionsAPI } from '../../lib/api';
import {
  Rocket, Clock, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle2, X, SkipForward, Play, BookOpen, Loader2
} from 'lucide-react';

export default function MissionCard({ mission, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  if (!mission || mission.error) return null;

  const isActive = mission.status === 'pending' || mission.status === 'in_progress';
  const isCompleted = mission.status === 'completed';
  const isResolved = mission.status === 'skipped' || mission.status === 'failed';

  const handleStart = async () => {
    try {
      await missionsAPI.updateStatus(mission.id, 'in_progress');
      onStatusChange?.({ ...mission, status: 'in_progress' });
    } catch (e) {
      console.error('Failed to start mission:', e);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await missionsAPI.complete(mission.id, notes || undefined);
      onStatusChange?.({ ...mission, status: 'completed' }, res.streak_days);
    } catch (e) {
      console.error('Failed to complete mission:', e);
    } finally {
      setCompleting(false);
    }
  };

  const handleSkip = async () => {
    try {
      await missionsAPI.updateStatus(mission.id, 'skipped');
      onStatusChange?.({ ...mission, status: 'skipped' });
    } catch (e) {
      console.error('Failed to skip mission:', e);
    }
  };

  const steps = mission.steps || [];
  const resources = mission.resources || [];

  return (
    <div className={`
      glass-card p-6 transition-all duration-300
      ${isActive ? 'border-l-4 border-l-primary-500' : ''}
      ${isCompleted ? 'border-l-4 border-l-accent-500 bg-accent-50/20' : ''}
      ${isResolved ? 'opacity-70' : ''}
    `}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <Rocket className={`w-5 h-5 ${isCompleted ? 'text-accent-500' : 'text-primary-500'}`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isCompleted ? 'text-accent-600' : 'text-primary-600'
            }`}>
              {isCompleted ? "Mission Complete ✓" : isResolved ? `Mission ${mission.status}` : "Today's Mission"}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-display font-bold text-surface-900 mb-2">
            {mission.title}
          </h3>

          {/* Objective */}
          <p className="text-surface-800/70 text-sm mb-4">{mission.objective}</p>

          {/* Meta tags */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-surface-800/60">
              <Clock className="w-3.5 h-3.5" />
              {mission.estimated_minutes} min
            </span>
            {mission.target_skill && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                {mission.target_skill}
              </span>
            )}
            {mission.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                mission.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-700' :
                mission.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              }`}>
                {mission.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {isActive && (
          <div className="flex flex-col gap-2 shrink-0">
            {mission.status === 'pending' ? (
              <button
                onClick={handleStart}
                className="gradient-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity focus-ring flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Start
              </button>
            ) : (
              <button
                onClick={() => setShowNotes(!showNotes)}
                disabled={completing}
                className="gradient-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity focus-ring flex items-center gap-2"
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Complete
              </button>
            )}
            <button
              onClick={handleSkip}
              className="text-xs text-surface-800/50 hover:text-surface-800/80 transition-colors flex items-center gap-1 justify-center"
            >
              <SkipForward className="w-3 h-3" /> Skip
            </button>
          </div>
        )}
      </div>

      {/* Completion notes input */}
      {showNotes && (
        <div className="mt-4 pt-4 border-t border-surface-200 animate-fade-in-up">
          <label className="text-xs font-medium text-surface-800/60 mb-2 block">
            What did you learn? (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quick reflection on what you accomplished..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-surface-200 bg-white focus:outline-none focus:border-primary-400 transition-colors"
            />
            <button
              onClick={handleComplete}
              disabled={completing}
              className="gradient-primary text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              {completing ? 'Saving...' : 'Done!'}
            </button>
          </div>
        </div>
      )}

      {/* Expandable Steps */}
      {steps.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide steps' : `View ${steps.length} steps`}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 animate-fade-in-up">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-surface-800/70 pl-2"
                >
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}

              {/* Resources */}
              {resources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-surface-200">
                  <h4 className="text-xs font-semibold text-surface-800/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Resources
                  </h4>
                  <div className="space-y-1.5">
                    {resources.map((res, i) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 transition-colors group"
                      >
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        {res.title}
                        <span className="text-surface-800/30 text-[10px]">({res.type})</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
