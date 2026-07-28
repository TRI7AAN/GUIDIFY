/**
 * CareerGoalsForm — Onboarding Step 2
 * 
 * Collects the CRITICAL fields required for roadmap generation that were
 * missing from the original onboarding (per logs.md critical blocker #2):
 *   - target_role (schema.md §1: learners.target_role)
 *   - current skills (schema.md §2: learner_profiles.skills)
 *   - interests (schema.md §2: learner_profiles.interests)
 *   - weekly learning hours (dataflow.md: used for mission pacing)
 * 
 * Per schema.md: These map to segment (school/college/graduate/professional)
 * which is auto-derived from the currentClass field in ProfileForm.
 */

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Target, Plus, X, Clock, Sparkles } from 'lucide-react';

// Skill suggestions by category — helps users who don't know what to type
const SKILL_SUGGESTIONS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Java', 'C++',
  'Data Analysis', 'Machine Learning', 'UI/UX Design', 'Cloud (AWS/GCP)',
  'Communication', 'Leadership', 'Project Management', 'Excel', 'Git',
  'Public Speaking', 'Problem Solving', 'Research', 'Writing',
];

const INTEREST_SUGGESTIONS = [
  'Web Development', 'Mobile Apps', 'AI & Machine Learning', 'Data Science',
  'Cybersecurity', 'Cloud Computing', 'Game Development', 'Blockchain',
  'IoT', 'DevOps', 'Product Management', 'Digital Marketing',
  'Entrepreneurship', 'Finance & Fintech', 'Healthcare Tech', 'EdTech',
];

const LEARNING_HOURS = [
  { value: '3', label: '~3 hrs/week', desc: 'Casual pace' },
  { value: '5', label: '~5 hrs/week', desc: 'Steady learner' },
  { value: '10', label: '~10 hrs/week', desc: 'Dedicated' },
  { value: '15', label: '15+ hrs/week', desc: 'Intensive' },
];

export default function CareerGoalsForm() {
  const { profileData, setProfileData, nextStep, isLoading } = useOnboarding();

  const [targetRole, setTargetRole] = useState(profileData.targetRole || '');
  const [skills, setSkills] = useState(profileData.skills || []);
  const [interests, setInterests] = useState(profileData.interests || []);
  const [learningHours, setLearningHours] = useState(profileData.learningHours || '5');
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [errors, setErrors] = useState({});

  // Sync back to context on change
  useEffect(() => {
    setProfileData(prev => ({
      ...prev,
      targetRole,
      skills,
      interests,
      learningHours,
    }));
  }, [targetRole, skills, interests, learningHours]);

  const addSkill = (skill) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 15) {
      setSkills(prev => [...prev, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setSkills(prev => prev.filter(s => s !== skill));
  };

  const addInterest = (interest) => {
    const trimmed = interest.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 10) {
      setInterests(prev => [...prev, trimmed]);
      setInterestInput('');
    }
  };

  const removeInterest = (interest) => {
    setInterests(prev => prev.filter(i => i !== interest));
  };

  const validate = () => {
    const newErrors = {};
    if (!targetRole.trim()) newErrors.targetRole = 'Please enter your career goal';
    if (skills.length === 0) newErrors.skills = 'Add at least one skill';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Save to context and advance
    setProfileData(prev => ({
      ...prev,
      targetRole,
      skills,
      interests,
      learningHours,
    }));

    nextStep();
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <Target className="w-7 h-7 text-primary-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">
          Your Career Goals
        </h2>
        <p className="text-surface-800/60 text-sm">
          This information drives your personalized roadmap and daily missions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Role */}
        <div>
          <label className="block text-sm font-medium text-surface-900 mb-1.5">
            What role are you aiming for? *
          </label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => { setTargetRole(e.target.value); if (errors.targetRole) setErrors(prev => ({...prev, targetRole: null})); }}
            placeholder="e.g. Full Stack Developer, Data Scientist, Product Manager"
            className="w-full px-4 py-3 rounded-xl border border-surface-300 bg-white text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          {errors.targetRole && <p className="text-danger text-xs mt-1">{errors.targetRole}</p>}
        </div>

        {/* Current Skills */}
        <div>
          <label className="block text-sm font-medium text-surface-900 mb-1.5">
            Skills you already have *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
              placeholder="Type a skill and press Enter"
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-300 bg-white text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => addSkill(skillInput)}
              className="px-3 py-2.5 rounded-xl bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Selected skills */}
          <div className="flex flex-wrap gap-2 mb-2">
            {skills.map(skill => (
              <span key={skill} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-danger transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {/* Suggestions */}
          {skills.length < 5 && (
            <div className="flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 8).map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addSkill(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-full border border-surface-200 text-surface-800/60 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          )}
          {errors.skills && <p className="text-danger text-xs mt-1">{errors.skills}</p>}
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-medium text-surface-900 mb-1.5">
            Areas you're interested in
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {interests.map(interest => (
              <span key={interest} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-100 text-accent-600 text-xs font-medium">
                {interest}
                <button type="button" onClick={() => removeInterest(interest)} className="hover:text-danger transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_SUGGESTIONS.filter(i => !interests.includes(i)).slice(0, 10).map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addInterest(suggestion)}
                className="text-xs px-2.5 py-1 rounded-full border border-surface-200 text-surface-800/60 hover:border-accent-400 hover:text-accent-600 hover:bg-accent-50 transition-all"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Learning Hours */}
        <div>
          <label className="block text-sm font-medium text-surface-900 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-surface-800/60" />
            How many hours can you dedicate weekly?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {LEARNING_HOURS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLearningHours(option.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  learningHours === option.value
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <p className={`text-sm font-semibold ${learningHours === option.value ? 'text-primary-700' : 'text-surface-900'}`}>
                  {option.label}
                </p>
                <p className="text-xs text-surface-800/50">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl gradient-primary text-white font-semibold text-base hover:opacity-90 transition-opacity focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Continue to Personality Analysis'}
        </button>
      </form>
    </div>
  );
}
