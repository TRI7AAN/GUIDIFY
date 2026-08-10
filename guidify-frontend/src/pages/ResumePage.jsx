import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { resumeAPI, getErrorMessage } from '../lib/api';
import { queryKeys } from '../hooks/query';
import ResumeFeedback from '../components/resume/ResumeFeedback';
import {
  FileText, Upload, ChevronLeft, CheckCircle2,
  AlertCircle, Sparkles, FileUp, X, RotateCcw,
  Briefcase, ArrowRight, BookOpen, Search, Target,
  ChevronDown, ChevronRight as ChevronRightIcon, GraduationCap, TrendingUp
} from 'lucide-react';

const POLL_INTERVAL = 4000;
const POLL_MAX_ATTEMPTS = 40;

function CircularScore({ score, size = 100, strokeWidth = 6, color = '#3cff14' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1F2330" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-display font-bold text-white">{score}</span>
        <span className="text-[9px] text-[#A4ACBC]">/ 100</span>
      </div>
    </div>
  );
}

function JDMatchResults({ data }) {
  const [expandedChange, setExpandedChange] = useState(null);
  if (!data) return null;

  return (
    <div className="space-y-4 animate-fade-in-up mt-6">
      {/* Match Score */}
      <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-6 text-center">
        <CircularScore score={data.match_score} size={120} strokeWidth={8}
          color={data.match_score >= 70 ? '#3cff14' : data.match_score >= 40 ? '#fbbf24' : '#ef4444'} />
        <p className="text-sm text-[#A4ACBC] mt-3">{data.match_summary}</p>
      </div>

      {/* Skills Overlap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.matching_skills?.length > 0 && (
          <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#3cff14]" /> Matching Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {data.matching_skills.map((s, i) => (
                <span key={i} className="text-xs bg-[#3cff14]/10 text-[#3cff14] px-2.5 py-1 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}
        {data.missing_skills?.length > 0 && (
          <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Missing Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {data.missing_skills.map((s, i) => (
                <span key={i} className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resume Changes */}
      {data.resume_changes?.length > 0 && (
        <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4AD8E6]" /> Suggested Resume Changes
          </h4>
          <div className="space-y-2">
            {data.resume_changes.map((change, i) => (
              <div key={i} className="border border-[#1F2330] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedChange(expandedChange === i ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-[#1F2330]/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#4AD8E6]/10 text-[#4AD8E6]">
                      {change.section}
                    </span>
                    <span className="text-sm text-[#A4ACBC] truncate">{change.reason}</span>
                  </div>
                  {expandedChange === i ? <ChevronDown className="w-4 h-4 text-[#A4ACBC] shrink-0" /> : <ChevronRightIcon className="w-4 h-4 text-[#A4ACBC] shrink-0" />}
                </button>
                {expandedChange === i && (
                  <div className="px-3 pb-3 space-y-2 animate-fade-in-up">
                    {change.current_text && (
                      <div className="p-2.5 rounded-lg bg-red-900/10 border border-red-500/20">
                        <span className="text-[10px] font-bold text-red-400 uppercase block mb-1">Current</span>
                        <p className="text-xs text-red-300/80">{change.current_text}</p>
                      </div>
                    )}
                    <div className="p-2.5 rounded-lg bg-emerald-900/10 border border-emerald-500/20">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Suggested</span>
                      <p className="text-xs text-emerald-300/80">{change.suggested_text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Recommendations */}
      {data.courses?.length > 0 && (
        <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-violet-400" /> Recommended Courses
          </h4>
          <div className="space-y-2">
            {data.courses.map((course, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#0D0F18] border border-[#1F2330]">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{course.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {course.provider && (
                      <span className="text-[10px] text-[#A4ACBC] bg-[#1F2330] px-2 py-0.5 rounded-full">{course.provider}</span>
                    )}
                    <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">{course.skill_targeted}</span>
                  </div>
                  <p className="text-xs text-[#A4ACBC] mt-1">{course.relevance}</p>
                </div>
                {course.url && (
                  <a href={course.url} target="_blank" rel="noopener noreferrer"
                    className="text-[#3cff14] hover:text-[#3cff14]/80 shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job Suggestions */}
      {data.job_suggestions?.length > 0 && (
        <div className="bg-[#151821] border border-[#1F2330] rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#3cff14]" /> Jobs You Should Apply For
          </h4>
          <div className="space-y-2">
            {data.job_suggestions.map((job, i) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-[#0D0F18] border border-[#1F2330]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{job.title}</p>
                  {job.company_type && (
                    <span className="text-[10px] text-[#A4ACBC] bg-[#1F2330] px-2 py-0.5 rounded-full">{job.company_type}</span>
                  )}
                  <p className="text-xs text-[#A4ACBC] mt-1">{job.match_reason}</p>
                  {job.search_query && (
                    <p className="text-[10px] text-[#3cff14] mt-1">
                      Search: "{job.search_query}"
                    </p>
                  )}
                </div>
                {job.estimated_fit_pct != null && (
                  <div className="flex flex-col items-center shrink-0 ml-3">
                    <span className="text-lg font-bold text-[#3cff14]">{job.estimated_fit_pct}%</span>
                    <span className="text-[9px] text-[#A4ACBC]">fit</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const mountedRef = useRef(true);

  // JD Matching state
  const [jdTitle, setJdTitle] = useState('');
  const [jdCompany, setJdCompany] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdLoading, setJdLoading] = useState(false);
  const [jdResult, setJdResult] = useState(null);
  const [jdError, setJdError] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await resumeAPI.getCurrent();
        if (!cancelled && data && data.parsed_data) setResult(data);
      } catch {
        // No existing resume — show upload form
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setError(null);
      }
    }
  };

  const validateFile = (f) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(f.type)) {
      setError('Please upload a PDF or DOCX file.');
      return false;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return false;
    }
    return true;
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const pollForResult = async (resumeId, attempts = 0) => {
    if (!mountedRef.current) return null;
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    if (attempts >= POLL_MAX_ATTEMPTS) return null;
    try {
      const data = await resumeAPI.get(resumeId);
      if (data?.parsed_data) return data;
    } catch {
      // Transient error — keep polling
    }
    return pollForResult(resumeId, attempts + 1);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await resumeAPI.upload(formData);
      const analyzed = await pollForResult(res?.id);
      if (analyzed) {
        setResult(analyzed);
      } else {
        setError('AI analysis is still running. Your resume was uploaded — refresh this page in a few minutes to see results.');
      }
    } catch (e) {
      const msg = e.response?.data?.error?.message || 'Upload failed. Please try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleMatchJD = async () => {
    if (!jdText.trim() || !jdTitle.trim()) return;
    setJdLoading(true);
    setJdError(null);
    setJdResult(null);
    try {
      const data = await resumeAPI.matchJD({
        job_title: jdTitle,
        company: jdCompany || undefined,
        job_description: jdText,
      });
      setJdResult(data);
      // The dashboard's Personalized Learning Path shows these course
      // suggestions, so refetch it to reflect the fresh report.
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.data });
    } catch (e) {
      const msg = getErrorMessage(e, 'JD analysis failed. Please try again.');
      setJdError(msg);
    } finally {
      setJdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0F18]">
      {/* Header */}
      <header className="bg-[#0D0F18]/80 backdrop-blur-md border-b border-[#1F2330] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-[#A4ACBC] hover:text-[#3cff14] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-display font-bold text-[#3cff14] tracking-tight">
            Resume Analysis
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-[#3cff14]/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#3cff14]" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">
            AI Resume Analysis
          </h2>
          <p className="text-[#A4ACBC] max-w-md mx-auto">
            Upload your resume for AI-powered parsing, scoring, and actionable feedback 
            tailored to your target career role.
          </p>
        </div>

        {/* Upload Area — hidden when showing results */}
        {!result && !loading && (
        <div
          className={`
            bg-[#151821] border border-[#1F2330] p-8 mb-6 rounded-xl animate-fade-in-up transition-all duration-200
            ${dragActive ? 'border-2 border-dashed border-[#3cff14]/50 bg-[#3cff14]/5' : 'border-2 border-dashed border-[#1F2330]'}
            ${file ? 'border-[#4AD8E6]/50 bg-[#4AD8E6]/5' : ''}
          `}
          style={{ animationDelay: '0.1s' }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="text-center">
              <FileUp className="w-12 h-12 text-[#A4ACBC] mx-auto mb-4" />
              <p className="text-[#A4ACBC] mb-2">
                Drag & drop your resume here, or
              </p>
              <label className="inline-block cursor-pointer">
                <span className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity focus-ring inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Browse Files
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              <p className="text-xs text-[#A4ACBC]/60 mt-3">
                Supports PDF and DOCX • Max 10MB
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4AD8E6]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#4AD8E6]" />
                </div>
                <div>
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-xs text-[#A4ACBC]">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setError(null); }}
                className="text-[#A4ACBC]/60 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-900/20 border border-red-500/30 mb-6 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Upload Button */}
        {file && !result && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity focus-ring flex items-center justify-center gap-2 mb-6 animate-fade-in-up"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Analyzing your resume...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Resume with AI
              </>
            )}
          </button>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-[#151821] border border-[#1F2330] p-6 rounded-xl flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-[#1F2330]" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-[#1F2330] rounded w-48" />
                <div className="h-4 bg-[#1F2330] rounded w-72" />
              </div>
            </div>
            <div className="bg-[#151821] border border-[#1F2330] p-5 rounded-xl space-y-3">
              <div className="h-4 bg-[#1F2330] rounded w-32" />
              <div className="h-3 bg-[#1F2330] rounded w-full" />
              <div className="h-3 bg-[#1F2330] rounded w-5/6" />
            </div>
          </div>
        )}

        {/* Feedback View */}
        {result && !uploading && (
          <>
            <ResumeFeedback data={result} />
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => { setResult(null); setFile(null); setJdResult(null); }}
                className="flex items-center gap-2 text-sm font-medium text-[#3cff14] hover:text-[#3cff14]/80 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Upload New Resume
              </button>
            </div>

            {/* ── JD Matching Section ──────────────────────── */}
            <div className="mt-12 pt-8 border-t border-[#1F2330]">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#4AD8E6]/10 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6 text-[#4AD8E6]" />
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-1">
                  Match to Job Description
                </h3>
                <p className="text-sm text-[#A4ACBC] max-w-md mx-auto">
                  Paste a job description to see how well your resume fits, get tailored change suggestions, and discover courses & similar roles.
                </p>
              </div>

              <div className="space-y-3 bg-[#151821] border border-[#1F2330] rounded-xl p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={jdTitle}
                    onChange={(e) => setJdTitle(e.target.value)}
                    placeholder="Job Title *"
                    className="text-sm px-4 py-2.5 rounded-lg border border-[#1F2330] bg-[#0D0F18] text-white placeholder:text-[#A4ACBC]/50 focus:outline-none focus:border-[#4AD8E6] transition-colors"
                  />
                  <input
                    type="text"
                    value={jdCompany}
                    onChange={(e) => setJdCompany(e.target.value)}
                    placeholder="Company (optional)"
                    className="text-sm px-4 py-2.5 rounded-lg border border-[#1F2330] bg-[#0D0F18] text-white placeholder:text-[#A4ACBC]/50 focus:outline-none focus:border-[#4AD8E6] transition-colors"
                  />
                </div>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={6}
                  className="w-full text-sm px-4 py-3 rounded-lg border border-[#1F2330] bg-[#0D0F18] text-white placeholder:text-[#A4ACBC]/50 focus:outline-none focus:border-[#4AD8E6] transition-colors resize-none"
                />

                {jdError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{jdError}</p>
                  </div>
                )}

                <button
                  onClick={handleMatchJD}
                  disabled={jdLoading || !jdTitle.trim() || !jdText.trim()}
                  className="w-full py-3 rounded-xl bg-[#4AD8E6]/10 border border-[#4AD8E6]/30 text-[#4AD8E6] font-semibold hover:bg-[#4AD8E6]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {jdLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-[#4AD8E6] border-t-transparent animate-spin" />
                      Analyzing fit...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      Analyze Fit
                    </>
                  )}
                </button>
              </div>

              <JDMatchResults data={jdResult} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

