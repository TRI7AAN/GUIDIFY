/**
 * SkillGraph — Phase 3 dashboard component
 *
 * Renders a visual bar chart of skill mastery vs target role
 * expectations using the skill_graph data from the dashboard API.
 * Each skill shows current level (filled) vs target level (outline).
 *
 * Per remainingtasks.md §3.2: "Render visual skill mastery graph
 * vs target role expectations on the dashboard."
 *
 * Uses TailwindCSS — no external charting library needed.
 */

import React from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';

const LEVEL_LABELS = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
const BAR_COLORS = ['bg-surface-200', 'bg-primary-300', 'bg-primary-400', 'bg-primary-500', 'bg-primary-600'];

export default function SkillGraph({ skills = [], onSeeAll }) {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-surface-900">Skill Progress</h3>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
          >
            See all <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {skills.map((s, i) => {
          const pct = s.target_level > 0 ? Math.round((s.level / s.target_level) * 100) : 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-surface-800 truncate max-w-[60%]">
                  {s.skill}
                </span>
                <span className="text-[10px] text-surface-800/50">
                  {LEVEL_LABELS[s.level] || 'None'} → {LEVEL_LABELS[s.target_level] || 'Target'}
                </span>
              </div>
              {/* Bar track */}
              <div className="relative h-2 bg-surface-100 rounded-full overflow-hidden">
                {/* Target outline */}
                <div
                  className="absolute inset-y-0 left-0 border-2 border-dashed border-surface-300 rounded-full"
                  style={{ width: `${(s.target_level / 4) * 100}%` }}
                />
                {/* Current fill */}
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    BAR_COLORS[s.level] || BAR_COLORS[0]
                  }`}
                  style={{ width: `${(s.level / 4) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-primary-500" />
          <span className="text-[10px] text-surface-800/50">Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full border border-dashed border-surface-300" />
          <span className="text-[10px] text-surface-800/50">Target</span>
        </div>
      </div>
    </div>
  );
}
