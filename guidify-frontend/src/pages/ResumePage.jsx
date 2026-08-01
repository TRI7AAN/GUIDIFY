/**
 * Resume Page — design.md §2.4
 * 
 * Phase 1: Upload resume, view AI-powered parsing results,
 * score, gap analysis, and actionable improvement suggestions.
 * Loads existing resume on mount if available.
 * 
 * Uses TailwindCSS design system.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from '../lib/api';
import ResumeFeedback from '../components/resume/ResumeFeedback';
import {
  FileText, Upload, ChevronLeft, CheckCircle2,
  AlertCircle, Sparkles, FileUp, X, RotateCcw
} from 'lucide-react';

const POLL_INTERVAL = 4000;
const POLL_MAX_ATTEMPTS = 40; // ~160s cap on background AI analysis

export default function ResumePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const mountedRef = useRef(true);

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
                onClick={() => { setResult(null); setFile(null); }}
                className="flex items-center gap-2 text-sm font-medium text-[#3cff14] hover:text-[#3cff14]/80 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Upload New Resume
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
