/**
 * InterviewPage — Phase 4 chat UI + Phase 4.5 Delivery Analytics
 *
 * Interactive mock interview with two phases:
 *   1. Track selection (technical / HR) + optional camera consent
 *   2. Chat interface: question → answer → next question → ... → feedback report
 *
 * Backend handles question generation and session management.
 * MAX_QUESTIONS = 10 (enforced server-side).
 * Delivery Analytics (Phase 4.5) is additive — camera off = same text-only flow.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewAPI } from '../lib/api';
import {
  initDeliveryAnalytics, initAudioAnalysis,
  finalizeDeliveryMetrics, stopDeliveryAnalytics, checkDeliverySupport
} from '../delivery-analytics';
import {
  ChevronLeft, Send, Loader2, Brain, Users,
  CheckCircle2, AlertTriangle, ArrowUpRight, RotateCcw,
  Camera, CameraOff, Video
} from 'lucide-react';

const TRACKS = [
  { id: 'technical', label: 'Technical', icon: Brain, desc: 'Data structures, system design, coding' },
  { id: 'hr', label: 'HR / Behavioral', icon: Users, desc: 'STAR method, culture fit, leadership' },
];

function DeliveryConsentScreen({ onProceed, track }) {
  const [cameraWanted, setCameraWanted] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    checkDeliverySupport().then(ok => setSupported(ok));
  }, []);

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <Video className="w-7 h-7 text-primary-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">
          Interview Settings
        </h2>
        <p className="text-surface-800/60 text-sm">
          {track === 'technical' ? 'Technical' : 'HR / Behavioral'} interview · 10 questions
        </p>
      </div>

      {supported && (
        <label className={`block p-5 rounded-xl border transition-all cursor-pointer mb-4 ${
          cameraWanted ? 'border-primary-400 bg-primary-50' : 'border-surface-200 bg-white hover:border-surface-300'
        }`}>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={cameraWanted}
              onChange={(e) => setCameraWanted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="font-medium text-surface-900 flex items-center gap-2">
                Enable camera for delivery feedback
                <span className="text-[10px] bg-surface-100 text-surface-800/50 px-1.5 py-0.5 rounded-full font-semibold">Optional</span>
              </p>
              <p className="text-sm text-surface-800/60 mt-1 leading-relaxed">
                Your camera never leaves your device — we only calculate a few numbers like eye contact percentage and pacing. No video is recorded or uploaded.
              </p>
            </div>
          </div>
        </label>
      )}

      {!supported && (
        <div className="glass-card p-5 mb-4">
          <p className="text-sm text-surface-800/60 flex items-center gap-2">
            <CameraOff className="w-4 h-4 text-surface-800/40" />
            Camera delivery feedback is not supported on this device/browser. You'll proceed with text-only.
          </p>
        </div>
      )}

      <button
        onClick={() => onProceed(cameraWanted && supported)}
        className="w-full py-3.5 rounded-xl gradient-primary text-white font-semibold text-base hover:opacity-90 transition-opacity focus-ring flex items-center justify-center gap-2"
      >
        Start Interview
      </button>
    </div>
  );
}

function FeedbackReport({ feedback, onRestart }) {
  if (!feedback) return null;
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="glass-card p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary-500" />
        </div>
        <h3 className="text-xl font-display font-bold text-surface-900 mb-1">Interview Complete</h3>
        <div className="mt-4">
          <span className="text-4xl font-display font-bold text-primary-600">{feedback.readiness_subscore}</span>
          <span className="text-sm text-surface-800/50 ml-1">/ 100</span>
          <p className="text-xs text-surface-800/50 mt-1">Readiness Score</p>
        </div>
      </div>

      {feedback.communication_notes && (
        <div className="glass-card p-5">
          <p className="text-sm font-semibold text-surface-900 mb-2">Overall</p>
          <p className="text-sm text-surface-800/70 leading-relaxed">{feedback.communication_notes}</p>
        </div>
      )}

      {feedback.strengths?.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-sm font-semibold text-surface-900 mb-2">Strengths</p>
          <ul className="space-y-1.5">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm text-surface-800/70 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.gaps?.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-sm font-semibold text-surface-900 mb-2">Areas to Improve</p>
          <ul className="space-y-1.5">
            {feedback.gaps.map((g, i) => (
              <li key={i} className="text-sm text-surface-800/70 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.suggested_missions?.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-sm font-semibold text-surface-900 mb-2">Suggested Practice</p>
          <ul className="space-y-1.5">
            {feedback.suggested_missions.map((m, i) => (
              <li key={i} className="text-sm text-surface-800/70 flex items-center gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                <span>{m.title}</span>
                {m.target_skill && (
                  <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">{m.target_skill}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onRestart}
        className="w-full glass-card p-4 text-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" /> Start New Interview
      </button>
    </div>
  );
}

export default function InterviewPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('select'); // select | consent | chat | feedback
  const [track, setTrack] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const chatEndRef = useRef(null);
  const videoRef = useRef(null);
  const transcriptTextsRef = useRef([]);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopDeliveryAnalytics();
  }, []);

  const handleTrackSelected = (selectedTrack) => {
    setTrack(selectedTrack);
    setPhase('consent');
  };

  const handleConsentComplete = async (wantsCamera) => {
    setPhase('chat');
    setLoading(true);

    try {
      const res = await interviewAPI.startSession(track);
      setSessionId(res.session_id);
      setMessages([{ role: 'interviewer', content: res.first_question }]);
      transcriptTextsRef.current = [];

      // Init delivery analytics if camera wanted
      if (wantsCamera && videoRef.current) {
        const started = await initDeliveryAnalytics(videoRef.current, true);
        setCameraEnabled(started);
        if (started && videoRef.current.srcObject) {
          initAudioAnalysis(videoRef.current.srcObject);
        }
      }
    } catch (e) {
      console.error('Failed to start interview:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const answer = input.trim();
    if (!answer || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'candidate', content: answer }]);
    transcriptTextsRef.current.push(answer);
    setLoading(true);

    try {
      const res = await interviewAPI.submitAnswer(sessionId, answer);

      if (res.status === 'completed') {
        // Submit delivery metrics before showing feedback
        if (cameraEnabled) {
          const payload = finalizeDeliveryMetrics(transcriptTextsRef.current);
          if (payload) {
            try {
              await interviewAPI.submitDeliveryMetrics(sessionId, payload);
            } catch (e) {
              console.error('Failed to submit delivery metrics:', e);
            }
          }
          stopDeliveryAnalytics();
        }

        setMessages(prev => [...prev, { role: 'system', content: 'Interview complete. Generating feedback...' }]);
        setFeedback(res.feedback_report);
        setPhase('feedback');
      } else if (res.next_question) {
        setMessages(prev => [...prev, { role: 'interviewer', content: res.next_question }]);
      }
    } catch (e) {
      console.error('Failed to submit answer:', e);
      setMessages(prev => [...prev, { role: 'system', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const handleRestart = () => {
    stopDeliveryAnalytics();
    setPhase('select');
    setTrack(null);
    setSessionId(null);
    setMessages([]);
    setInput('');
    setFeedback(null);
    setCameraEnabled(false);
    transcriptTextsRef.current = [];
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Hidden video element for delivery analytics */}
      <video ref={videoRef} className="hidden" playsInline muted width={320} height={240} />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => phase === 'select' ? navigate('/dashboard') : handleRestart()}
            className="flex items-center gap-2 text-sm font-medium text-surface-800 hover:text-primary-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {phase === 'select' ? 'Dashboard' : 'Exit'}
          </button>
          <h1 className="text-xl font-display font-bold text-primary-700 tracking-tight">
            AI Interview Coach
          </h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Track Selection */}
      {phase === 'select' && (
        <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
          <div className="text-center mb-10 animate-fade-in-up">
            <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">Choose Your Track</h2>
            <p className="text-surface-800/60 text-sm">10 questions. AI-powered feedback. No pressure.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTrackSelected(t.id)}
                disabled={loading}
                className="glass-card card-hover p-6 text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                  <t.icon className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="font-display font-semibold text-surface-900 mb-1">{t.label}</h3>
                <p className="text-sm text-surface-800/60">{t.desc}</p>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* Consent Screen */}
      {phase === 'consent' && (
        <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
          <DeliveryConsentScreen onProceed={handleConsentComplete} track={track} />
        </main>
      )}

      {/* Chat Interface */}
      {phase === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
              <div className="text-center text-xs text-surface-800/40 mb-4 flex items-center justify-center gap-2">
                {track === 'technical' ? 'Technical' : 'HR / Behavioral'} Interview
                {cameraEnabled && (
                  <span className="inline-flex items-center gap-1 text-primary-500">
                    <Camera className="w-3 h-3" /> Camera active
                  </span>
                )}
              </div>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'interviewer'
                      ? 'bg-white border border-surface-200 text-surface-900'
                      : msg.role === 'candidate'
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 text-surface-800/60 text-xs text-center mx-auto'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-surface-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    <span className="text-xs text-surface-800/50">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
          <div className="border-t border-surface-200 bg-white/80 backdrop-blur-md p-4">
            <div className="max-w-3xl mx-auto flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                disabled={loading}
                className="flex-1 text-sm px-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:border-primary-400 transition-colors disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={loading || !input.trim()}
                className="gradient-primary text-white px-5 py-3 rounded-xl hover:opacity-90 transition-opacity focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Feedback Report */}
      {phase === 'feedback' && (
        <main className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
          <FeedbackReport feedback={feedback} onRestart={handleRestart} />
        </main>
      )}
    </div>
  );
}
