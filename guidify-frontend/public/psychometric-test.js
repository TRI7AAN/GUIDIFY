/**
 * GUIDIFY Psychometric Test — Frontend Logic
 *
 * Standalone vanilla JS for the yes/maybe/no assessment.
 * Communicates with the FastAPI backend at /api/v1/psychometric-test/*
 */

// ── Configuration ──────────────────────────────────────────────────
const API_BASE = window.GUIDIFY_API_URL || 'http://127.0.0.1:8000/api/v1';

// ── State ──────────────────────────────────────────────────────────
let state = {
    sessionId: null,
    questions: [],
    currentIndex: 0,
    answers: [],          // { question_id, answer, response_time_ms }
    questionStartTime: 0,
    result: null,
};

// ── DOM Helpers ────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#screen-${id}`).classList.add('active');
}

// ── API Calls ──────────────────────────────────────────────────────
async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

async function apiPost(path, body) {
    // Attach auth token if available (Supabase session in sessionStorage)
    try {
        const raw = sessionStorage.getItem('sb-localhost-auth-token');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.access_token) {
                headers['Authorization'] = `Bearer ${parsed.access_token}`;
            }
        }
    } catch (_) { /* no auth token, proceed unauthenticated */ }
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `API error: ${res.status}`);
    }
    return res.json();
}

// ── Start Test ─────────────────────────────────────────────────────
async function startTest() {
    const btn = $('#btn-start');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;margin:0"></span> Loading...';

    try {
        const data = await apiGet('/psychometric-test/questions');
        state.sessionId = data.session_id;
        state.questions = data.questions;
        state.currentIndex = 0;
        state.answers = [];

        showScreen('test');
        renderQuestion();
    } catch (err) {
        console.error('Failed to start test:', err);
        alert('Could not load assessment questions. Please ensure the backend is running and try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Begin Assessment <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
}

// ── Render Question ────────────────────────────────────────────────
function renderQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) return;

    const total = state.questions.length;
    const idx = state.currentIndex + 1;

    // Update progress
    $('#progress-fill').style.width = `${(state.currentIndex / total) * 100}%`;
    $('#progress-label').textContent = `${idx} / ${total}`;

    // Record question start time for response-time tracking
    state.questionStartTime = Date.now();

    const categoryColors = {
        'Technical Aptitude': 'var(--primary-500)',
        'Creative Thinking': 'var(--accent-500)',
        'Leadership': 'oklch(0.55 0.14 265)',
        'Analytical Reasoning': 'var(--primary-600)',
        'Interpersonal Skills': 'var(--accent-600)',
    };
    const catColor = categoryColors[q.category] || 'var(--primary-500)';

    const html = `
        <div class="question-card animate-fade-in-up">
            <div class="question-category" style="background: ${catColor}">
                ${q.category}
            </div>
            <p class="question-text">${q.text}</p>
            <div class="options-grid">
                ${q.options.map(opt => `
                    <button class="option-btn" data-value="${opt.value}" onclick="selectAnswer('${opt.value}')">
                        <div class="option-icon">${getIcon(opt.value)}</div>
                        <span class="option-label">${opt.label}</span>
                        <span class="option-hint">${getHint(opt.value)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    $('#question-container').innerHTML = html;
}

function getIcon(value) {
    switch (value) {
        case 'yes': return '✓';
        case 'maybe': return '~';
        case 'no': return '✗';
        default: return '?';
    }
}

function getHint(value) {
    switch (value) {
        case 'yes': return 'Strongly agree';
        case 'maybe': return 'Somewhat';
        case 'no': return 'Not for me';
        default: return '';
    }
}

// ── Select Answer ──────────────────────────────────────────────────
function selectAnswer(value) {
    const responseTime = Date.now() - state.questionStartTime;
    const q = state.questions[state.currentIndex];

    // Visual feedback
    $$('.option-btn').forEach(btn => btn.classList.remove('selected'));
    $(`.option-btn[data-value="${value}"]`).classList.add('selected');

    // Record answer
    state.answers.push({
        question_id: q.id,
        answer: value,
        response_time_ms: responseTime,
    });

    // Brief delay for animation, then advance
    setTimeout(() => {
        state.currentIndex++;
        if (state.currentIndex < state.questions.length) {
            renderQuestion();
        } else {
            submitTest();
        }
    }, 280);
}

// ── Submit to Decision Engine ──────────────────────────────────────
async function submitTest() {
    showScreen('loading');

    try {
        const data = await apiPost('/psychometric-test/submit', {
            session_id: state.sessionId,
            answers: state.answers,
            user_id: getUserId(),
        });

        state.result = data.result;
        showScreen('results');
        renderResults(data.result);
    } catch (err) {
        console.error('Submit failed:', err);
        alert('Submission failed: ' + err.message);
        showScreen('test');
    }
}

function getUserId() {
    try {
        const raw = sessionStorage.getItem('sb-localhost-auth-token');
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed.user?.id || null;
        }
    } catch (_) {}
    return null;
}

// ── Render Results ─────────────────────────────────────────────────
function renderResults(result) {
    // Summary
    $('#results-summary').textContent = result.summary;

    // Overall score animation
    animateScore(result.overall_score);

    // Confidence
    $('#confidence-value').textContent = `${Math.round(result.confidence * 100)}%`;

    // Category bars
    const barsHtml = result.category_scores.map(cs => `
        <div class="cat-row">
            <div class="cat-header">
                <span class="cat-name">${cs.category}</span>
                <span class="cat-score">${cs.score.toFixed(1)} — ${cs.label}</span>
            </div>
            <div class="cat-bar">
                <div class="cat-fill" data-width="${cs.score}"></div>
            </div>
        </div>
    `).join('');
    $('#category-bars').innerHTML = barsHtml;

    // Animate bars after a short delay
    setTimeout(() => {
        $$('.cat-fill').forEach(fill => {
            fill.style.width = fill.dataset.width + '%';
        });
    }, 200);

    // Recommendations
    $('#rec-primary').textContent = result.primary_recommendation;
    $('#rec-secondary').textContent = result.secondary_recommendation;

    // Personality
    $('#personality-text').textContent = result.personality_profile;

    // Strengths
    $('#strengths-list').innerHTML = result.strengths
        .map(s => `<span class="tag">${s}</span>`)
        .join('');

    // Growth areas
    const growthHtml = result.growth_areas.length > 0
        ? result.growth_areas.map(g => `<span class="tag">${g}</span>`).join('')
        : '<span class="tag">No significant gaps — well balanced!</span>';
    $('#growth-list').innerHTML = growthHtml;
}

function animateScore(target) {
    const el = $('#overall-score');
    const circle = $('#score-circle');
    const circumference = 2 * Math.PI * 52; // r=52
    let current = 0;
    const step = target / 40; // 40 frames ~ 660ms

    function tick() {
        current = Math.min(current + step, target);
        el.textContent = Math.round(current);

        // Update ring
        const offset = circumference - (current / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        if (current < target) {
            requestAnimationFrame(tick);
        }
    }
    requestAnimationFrame(tick);
}

// ── Quit Test ──────────────────────────────────────────────────────
function quitTest() {
    if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
        state = { sessionId: null, questions: [], currentIndex: 0, answers: [], questionStartTime: 0, result: null };
        showScreen('landing');
    }
}

// ── Retake ─────────────────────────────────────────────────────────
function retakeTest() {
    state = { sessionId: null, questions: [], currentIndex: 0, answers: [], questionStartTime: 0, result: null };
    showScreen('landing');
}

// ── Download Report ────────────────────────────────────────────────
function downloadReport() {
    if (!state.result) return;

    const r = state.result;
    const lines = [
        '═══════════════════════════════════════════════════',
        '  GUIDIFY PSYCHOMETRIC ASSESSMENT REPORT',
        '═══════════════════════════════════════════════════',
        '',
        `Date: ${new Date().toLocaleDateString()}`,
        `Session: ${state.sessionId}`,
        '',
        '───────────────────────────────────────────────────',
        '  OVERALL SCORE',
        '───────────────────────────────────────────────────',
        `  Score:      ${r.overall_score}/100`,
        `  Confidence: ${Math.round(r.confidence * 100)}%`,
        '',
        '───────────────────────────────────────────────────',
        '  DIMENSION BREAKDOWN',
        '───────────────────────────────────────────────────',
        ...r.category_scores.map(cs =>
            `  ${cs.category.padEnd(24)} ${cs.score.toFixed(1).padStart(5)}  (${cs.label})`
        ),
        '',
        '───────────────────────────────────────────────────',
        '  RECOMMENDATIONS',
        '───────────────────────────────────────────────────',
        `  Primary:   ${r.primary_recommendation}`,
        `  Secondary: ${r.secondary_recommendation}`,
        '',
        '───────────────────────────────────────────────────',
        '  PERSONALITY PROFILE',
        '───────────────────────────────────────────────────',
        `  ${r.personality_profile}`,
        '',
        '───────────────────────────────────────────────────',
        '  STRENGTHS',
        '───────────────────────────────────────────────────',
        ...r.strengths.map(s => `  • ${s}`),
        '',
        '───────────────────────────────────────────────────',
        '  GROWTH AREAS',
        '───────────────────────────────────────────────────',
        ...(r.growth_areas.length ? r.growth_areas.map(g => `  • ${g}`) : ['  No significant gaps — well balanced!']),
        '',
        '═══════════════════════════════════════════════════',
        '  Generated by GUIDIFY Decision Engine v1.0',
        '═══════════════════════════════════════════════════',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guidify-assessment-${state.sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}
