/**
 * Resume Page — design.md §2.4
 * 
 * Phase 1 placeholder page with upload CTA.
 * Displays file upload area and links to resume scoring when backend is ready.
 * 
 * Uses TailwindCSS design system.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resumeAPI } from '../lib/api';
import {
  FileText, Upload, ChevronLeft, CheckCircle2,
  AlertCircle, Sparkles, FileUp, X
} from 'lucide-react';

export default function ResumePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

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

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await resumeAPI.upload(formData);
      setResult(res);
    } catch (e) {
      const msg = e.response?.data?.error?.message || 'Upload failed. The resume parsing feature is coming soon.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-display font-bold text-primary-700 tracking-tight">
            Resume Analysis
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">
            AI Resume Analysis
          </h2>
          <p className="text-surface-800/60 max-w-md mx-auto">
            Upload your resume for AI-powered parsing, scoring, and actionable feedback 
            tailored to your target career role.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`
            glass-card p-8 mb-6 animate-fade-in-up transition-all duration-200
            ${dragActive ? 'border-2 border-dashed border-primary-400 bg-primary-50/30' : 'border-2 border-dashed border-surface-300'}
            ${file ? 'border-accent-400 bg-accent-50/20' : ''}
          `}
          style={{ animationDelay: '0.1s' }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="text-center">
              <FileUp className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <p className="text-surface-800/70 mb-2">
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
              <p className="text-xs text-surface-800/40 mt-3">
                Supports PDF and DOCX • Max 10MB
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <p className="font-medium text-surface-900">{file.name}</p>
                  <p className="text-xs text-surface-800/50">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setError(null); }}
                className="text-surface-800/40 hover:text-danger transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 mb-6 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
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

        {/* Result */}
        {result && (
          <div className="glass-card p-6 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-accent-500" />
              <span className="font-semibold text-surface-900">Resume Analyzed</span>
            </div>
            <pre className="text-sm text-surface-800/70 whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
