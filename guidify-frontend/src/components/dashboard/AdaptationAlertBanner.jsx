/**
 * AdaptationAlertBanner — Phase 3 dashboard component
 *
 * Notifies the learner when their roadmap has been adapted
 * due to performance (consecutive failures) or goal changes.
 * Fetches adaptation status and shows contextual alerts.
 *
 * Per remainingtasks.md §3.2: "Notify learner when their
 * roadmap has adapted due to performance or goal changes."
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adaptationAPI } from '../../lib/api';
import { AlertTriangle, RefreshCw, ChevronRight, X } from 'lucide-react';

export default function AdaptationAlertBanner() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adaptationAPI.getStatus();
        if (!cancelled && data && !data.error) setStatus(data);
      } catch {
        // Adaptation endpoint may not have data yet — that's fine
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (dismissed || !status) return null;

  const failures = status.consecutive_failures || 0;
  const threshold = status.failure_threshold || 3;
  const inDebounce = status.in_debounce_window;
  const recentRegen = status.last_regeneration;

  // Show banner if learner is close to or past failure threshold, or recent adaptation happened
  const showFailureAlert = failures >= 2;
  const showRegenAlert = inDebounce && recentRegen;

  if (!showFailureAlert && !showRegenAlert) return null;

  return (
    <div className="mb-6 animate-fade-in-up">
      {showFailureAlert && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {failures >= threshold
                ? 'Your roadmap was adapted'
                : `You're struggling — ${threshold - failures} more skip${threshold - failures !== 1 ? 's' : ''} may trigger adaptation`}
            </p>
            <p className="text-xs text-amber-700/70 mt-1">
              {failures >= threshold
                ? 'We adjusted your learning path based on recent difficulty. Your missions should feel more manageable now.'
                : "If missions feel too hard, that's okay — the system will automatically adjust to your pace."}
            </p>
            <button
              onClick={() => navigate('/roadmap')}
              className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 transition-colors"
            >
              View updated roadmap <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showRegenAlert && !showFailureAlert && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
          <RefreshCw className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-800">Roadmap recently updated</p>
            <p className="text-xs text-primary-700/70 mt-1">
              Your learning path was regenerated to better match your goals and progress.
            </p>
            <button
              onClick={() => navigate('/roadmap')}
              className="mt-2 text-xs font-medium text-primary-700 hover:text-primary-800 flex items-center gap-1 transition-colors"
            >
              See changes <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => setDismissed(true)} className="text-primary-400 hover:text-primary-600 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
