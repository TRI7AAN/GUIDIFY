/**
 * ConsentStep — Onboarding Step 2 (DPDP compliance)
 *
 * Per rules.md §7: explicit consent at questionnaire time, not assumed.
 * - consent_data_processing: required to proceed (platform can't function without it)
 * - consent_ai_training: explicit opt-in, default off, revocable
 */

import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { Shield, CheckCircle2, Lock } from 'lucide-react';

export default function ConsentStep() {
  const { profileData, setProfileData, nextStep, isLoading } = useOnboarding();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const consentDataProcessing = profileData.consentDataProcessing || false;
  const consentAiTraining = profileData.consentAiTraining || false;

  const handleChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await supabase
        .from('learners')
        .update({
          consent_data_processing: consentDataProcessing,
          consent_ai_training: consentAiTraining,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      nextStep();
    } catch (e) {
      console.error("Failed to save consent:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      <div className="text-center mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-2">
          <Shield className="w-5 h-5 text-primary-600" />
        </div>
        <h2 className="text-xl font-display font-bold text-surface-900 mb-1">
          Your Data, Your Control
        </h2>
        <p className="text-surface-800/60 text-xs">
          We need your consent to process your data and personalize your experience.
        </p>
      </div>

      <div className="space-y-3">
        {/* Required: Data Processing */}
        <label className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
          consentDataProcessing
            ? 'border-primary-700 bg-primary-100'
            : 'border-surface-400 bg-surface-100 hover:border-surface-500'
        }`}>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentDataProcessing}
              onChange={(e) => handleChange('consentDataProcessing', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="font-medium text-surface-900 flex items-center gap-1.5 text-sm">
                Data Processing Consent
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Required</span>
              </p>
              <p className="text-xs text-surface-800/60 mt-0.5 leading-relaxed">
                I consent to GUIDIFY processing my profile data, resume content, and learning activity to provide personalized career guidance and daily missions.
              </p>
            </div>
          </div>
        </label>

        {/* Optional: AI Training */}
        <label className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
          consentAiTraining
            ? 'border-primary-700 bg-primary-100'
            : 'border-surface-400 bg-surface-100 hover:border-surface-500'
        }`}>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentAiTraining}
              onChange={(e) => handleChange('consentAiTraining', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="font-medium text-surface-900 flex items-center gap-1.5 text-sm">
                AI Training Consent
                <span className="text-[10px] bg-surface-100 text-surface-800/50 px-1.5 py-0.5 rounded-full font-semibold">Optional</span>
              </p>
              <p className="text-xs text-surface-800/60 mt-0.5 leading-relaxed">
                I allow my anonymized learning data to be used for improving GUIDIFY's AI models. You can revoke this at any time in Settings.
              </p>
            </div>
          </div>
        </label>

        {/* Privacy note */}
        <div className="flex items-start gap-2 text-xs text-surface-800/50 mt-2">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>Your data is encrypted, stored securely on Supabase, and never shared with third parties. You can delete your account and all data at any time.</p>
        </div>

        {/* Continue — requires data processing consent */}
        <button
          onClick={handleContinue}
          disabled={!consentDataProcessing || isLoading || saving}
          className="w-full py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
        >
          <CheckCircle2 className="w-4 h-4" />
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
