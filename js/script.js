/* ════════════════════════════════════════════════════════════════
   QUIZMASTER-PRO  |  script.js
   Uses fetch() to load JSON — works on GitHub Pages & any server
   ════════════════════════════════════════════════════════════════ */
'use strict';

/* ─── 1. PARTICLE BACKGROUND ────────────────────────────────────── */
const ParticleSystem = (() => {
  const canvas = document.getElementById('particleCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];
  const MAX    = window.innerWidth < 600 ? 60 : 130;
  const SPEED  = 0.35;
  const CONN   = 100;
  const COLORS = ['rgba(0,230,255,', 'rgba(155,93,229,', 'rgba(255,45,120,'];

  class Particle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x     = Math.random() * W;
      this.y     = init ? Math.random() * H : H + 10;
      this.vx    = (Math.random() - 0.5) * SPEED;
      this.vy    = -(Math.random() * SPEED * 0.8 + 0.1);
      this.r     = Math.random() * 1.8 + 0.4;
      this.alpha = Math.random() * 0.6 + 0.15;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -10 || this.x < -10 || this.x > W + 10) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.alpha + ')';
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function connect() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CONN) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = particles[i].color + (1 - d / CONN) * 0.18 + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    connect();
    requestAnimationFrame(tick);
  }

  function init() {
    resize();
    particles = Array.from({ length: MAX }, () => new Particle());
    window.addEventListener('resize', resize, { passive: true });
    tick();
  }

  return { init };
})();

/* ─── 2. STATE & LOCAL STORAGE ──────────────────────────────────── */
const LS_KEY = 'qmp_v2';

const state = {
  xp:           0,
  highScore:    0,
  totalQ:       0,
  totalCorrect: 0,
  played:       0,
  completedLevels: {},
  leaderboard: {
    daily:   { date: '', scores: [] },
    alltime: []
  }
};

function saveState() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch(e) {}
  const today = new Date().toDateString();
  if (state.leaderboard.daily.date !== today) {
    state.leaderboard.daily = { date: today, scores: [] };
    saveState();
  }
}

/* ─── 3. QUESTION CACHE (avoid re-fetching same class) ──────────── */
const questionCache = {};

async function loadClassData(cls) {
  if (questionCache[cls]) return questionCache[cls];          // already loaded
  const resp = await fetch('data/class' + cls + '.json');
  if (!resp.ok) throw new Error('Failed to load class ' + cls);
  const data = await resp.json();
  questionCache[cls] = data;
  return data;
}

/* ─── 4. QUIZ RUNTIME ───────────────────────────────────────────── */
const quiz = {
  cls:          1,
  subject:      '',
  mode:         'free',
  level:        1,
  pool:         [],
  queue:        [],
  idx:          0,
  score:        0,
  correct:      0,
  wrong:        0,
  streak:       0,
  timerSec:     20,
  timerInterval:null,
  answered:     false
};

/* ─── 5. SUBJECTS CONFIG ────────────────────────────────────────── */
const SUBJECTS = [
  { name: 'Math',                  icon: '🔢' },
  { name: 'Science',               icon: '🔬' },
  { name: 'Indian GK',             icon: '🇮🇳' },
  { name: 'Animals and Birds',     icon: '🦁' },
  { name: 'Geography',             icon: '🌍' },
  { name: 'Computer',              icon: '💻' },
  { name: 'Economics',             icon: '📈' },
  { name: 'Environmental Studies', icon: '🌿' },
  { name: 'Space',                 icon: '🚀' },
  { name: 'Hindi',                 icon: '📜' },
  { name: 'World GK',              icon: '🌐' }
];

/* ─── 6. DOM HELPER & SCREEN MANAGER ────────────────────────────── */
const $ = id => document.getElementById(id);

const SCREENS = {
  loading: $('loadingScreen'),
  home:    $('homeScreen'),
  level:   $('levelScreen'),
  quiz:    $('quizScreen'),
  result:  $('resultScreen')
};

function showScreen(name) {
  Object.entries(SCREENS).forEach(([k, el]) => {
    if (el) el.classList.toggle('active', k === name);
  });
}

/* ─── 7. LOADING ANIMATION ──────────────────────────────────────── */
const TIPS = [
  'Initializing Neural Engine…',
  'Loading 15,840 Questions…',
  'Calibrating Difficulty Matrix…',
  'Charging XP Boosters…',
  'Priming Leaderboard…',
  'Ready. Let\'s go! 🚀'
];

function runLoader() {
  const bar = $('loaderBar');
  const tip = $('loaderTip');
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 14 + 4;
    if (pct > 100) pct = 100;
    bar.style.width = pct + '%';
    tip.textContent = TIPS[Math.min(Math.floor(pct / (100 / TIPS.length)), TIPS.length - 1)];
    if (pct >= 100) {
      clearInterval(iv);
      setTimeout(() => { showScreen('home'); updateHeaderStats(); }, 400);
    }
  }, 90);
}

/* ─── 8. HOME SCREEN ────────────────────────────────────────────── */
function buildClassGrid() {
  const grid = $('classGrid');
  grid.innerHTML = '';
  for (let c = 1; c <= 12; c++) {
    const btn = document.createElement('button');
    btn.className = 'class-btn' + (c === quiz.cls ? ' selected' : '');
    btn.innerHTML = c + '<span>CLASS</span>';
    btn.dataset.cls = c;
    btn.addEventListener('click', () => selectClass(c));
    grid.appendChild(btn);
  }
}

function buildSubjectGrid() {
  const grid = $('subjectGrid');
  grid.innerHTML = '';
  SUBJECTS.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'subject-btn' + (sub.name === quiz.subject ? ' selected' : '');
    btn.innerHTML = '<span class="subj-icon">' + sub.icon + '</span>'
                  + '<span class="subj-name">' + sub.name + '</span>';
    btn.addEventListener('click', () => selectSubject(sub.name));
    grid.appendChild(btn);
  });
}

function selectClass(c) {
  quiz.cls = c;
  document.querySelectorAll('.class-btn').forEach(b =>
    b.classList.toggle('selected', Number(b.dataset.cls) === c)
  );
  $('subjectSection').style.display = 'block';
  $('modeSection').style.display    = 'none';
  quiz.subject = '';
  buildSubjectGrid();
  $('subjectSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function selectSubject(name) {
  quiz.subject = name;
  document.querySelectorAll('.subject-btn').forEach(b =>
    b.classList.toggle('selected', b.querySelector('.subj-name').textContent === name)
  );
  $('modeSection').style.display = 'block';
  $('modeSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ─── 9. START QUIZ  (async — loads JSON via fetch) ─────────────── */
async function startQuiz(mode, level) {
  if (!quiz.subject) { showToast('⚠️ Please select a subject first!'); return; }

  quiz.mode     = mode;
  quiz.level    = level || 1;
  quiz.score    = 0;
  quiz.correct  = 0;
  quiz.wrong    = 0;
  quiz.streak   = 0;
  quiz.idx      = 0;
  quiz.answered = false;

  // Show loading state on button
  showToast('Loading questions…');

  try {
    const data   = await loadClassData(quiz.cls);
    quiz.pool    = data[quiz.subject] || [];
    if (!quiz.pool.length) { showToast('⚠️ No questions found!'); return; }
  } catch(e) {
    showToast('⚠️ Could not load questions!');
    console.error(e);
    return;
  }

  const shuffled = shuffle(quiz.pool.slice());
  if (mode === 'free')  quiz.queue = shuffled;
  if (mode === 'timer') quiz.queue = shuffled.slice(0, 20);
  if (mode === 'level') quiz.queue = shuffled.slice(0, 5);

  $('quizModeBadge').textContent  = mode === 'free' ? 'FREE PLAY' : mode === 'timer' ? 'TIMER' : 'LEVEL ' + quiz.level;
  $('quizSubjectTag').textContent = quiz.subject;
  $('timerSection').style.display = mode === 'timer' ? 'flex' : 'none';

  showScreen('quiz');
  renderQuestion();
}

/* ─── 10. RENDER QUESTION ───────────────────────────────────────── */
function renderQuestion() {
  clearTimer();
  quiz.answered = false;
  $('btnNext').style.display       = 'none';
  $('streakDisplay').style.display = 'none';

  if (quiz.mode === 'free' && quiz.idx >= quiz.queue.length) {
    quiz.queue = shuffle(quiz.pool.slice());
    quiz.idx   = 0;
  }

  const q     = quiz.queue[quiz.idx];
  const total = quiz.mode === 'free' ? '∞' : quiz.mode === 'timer' ? 20 : 5;
  const curr  = quiz.idx + 1;

  if (quiz.mode !== 'free') {
    $('progressFill').style.width = ((curr - 1) / (quiz.mode === 'timer' ? 20 : 5) * 100) + '%';
  } else {
    $('progressFill').style.width = '0%';
  }

  $('progressText').textContent = 'Q ' + curr + ' / ' + total;
  $('qNumBadge').textContent    = q.serial ? '#' + q.serial : 'Q' + curr;
  $('questionText').textContent = q.question;
  $('scoreVal').textContent     = quiz.score;

  const grid = $('optionsGrid');
  grid.innerHTML = '';
  const LABELS = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.dataset.idx = LABELS[i];
    btn.dataset.val = opt;
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(btn, q.answer));
    grid.appendChild(btn);
  });

  const card = $('questionCard');
  card.style.animation = 'none';
  requestAnimationFrame(() => { card.style.animation = 'cardIn 0.35s ease'; });

  if (quiz.mode === 'timer') startTimer();
}

/* ─── 11. HANDLE ANSWER ─────────────────────────────────────────── */
function handleAnswer(btn, correct) {
  if (quiz.answered) return;
  quiz.answered = true;
  clearTimer();

  const isRight = btn.dataset.val === correct;

  document.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.val === correct)  b.classList.add('correct');
    else if (b === btn && !isRight) b.classList.add('wrong');
  });

  if (isRight) {
    quiz.correct++;
    quiz.streak++;
    const base        = quiz.mode === 'timer' ? 10 : quiz.mode === 'level' ? 15 : 5;
    const streakBonus = quiz.streak >= 3 ? Math.floor(quiz.streak / 3) * 5 : 0;
    quiz.score       += base + streakBonus;
    if (quiz.streak >= 3) {
      $('streakDisplay').style.display = 'flex';
      $('streakVal').textContent = quiz.streak;
    }
  } else {
    quiz.wrong++;
    quiz.streak = 0;
  }

  $('scoreVal').textContent = quiz.score;
  $('scoreVal').classList.remove('bump');
  requestAnimationFrame(() => $('scoreVal').classList.add('bump'));

  if (quiz.mode === 'free') {
    $('btnNext').style.display = 'block';
  } else {
    const max = quiz.mode === 'timer' ? 20 : 5;
    if (quiz.idx + 1 >= max) setTimeout(endQuiz, 1200);
    else $('btnNext').style.display = 'block';
  }
}

$('btnNext').addEventListener('click', () => { quiz.idx++; renderQuestion(); });

/* ─── 12. TIMER ─────────────────────────────────────────────────── */
function startTimer() {
  quiz.timerSec = 20;
  const fill = $('timerFill');
  const text = $('timerText');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  fill.classList.remove('warning');
  text.classList.remove('warning');
  text.textContent = 20;
  requestAnimationFrame(() => { fill.style.transition = 'width 1s linear'; });

  quiz.timerInterval = setInterval(() => {
    quiz.timerSec--;
    fill.style.width = (quiz.timerSec / 20 * 100) + '%';
    text.textContent = quiz.timerSec;
    if (quiz.timerSec <= 7) { fill.classList.add('warning'); text.classList.add('warning'); }
    if (quiz.timerSec <= 0) { clearTimer(); autoSkip(); }
  }, 1000);
}

function clearTimer() {
  if (quiz.timerInterval) { clearInterval(quiz.timerInterval); quiz.timerInterval = null; }
}

function autoSkip() {
  if (quiz.answered) return;
  quiz.answered = true;
  quiz.wrong++;
  quiz.streak = 0;
  document.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.val === quiz.queue[quiz.idx].answer) b.classList.add('correct');
  });
  if (quiz.idx + 1 >= 20) setTimeout(endQuiz, 1000);
  else setTimeout(() => { quiz.idx++; renderQuestion(); }, 1200);
}

/* ─── 13. END QUIZ / RESULT ─────────────────────────────────────── */
function endQuiz() {
  clearTimer();
  const total   = quiz.mode === 'timer' ? 20 : quiz.mode === 'level' ? 5 : (quiz.correct + quiz.wrong);
  const acc     = total > 0 ? Math.round(quiz.correct / total * 100) : 0;
  const xpTotal = quiz.score + (acc >= 80 ? 50 : acc >= 60 ? 20 : 0);

  const grade  = acc >= 90 ? 'S'  : acc >= 80 ? 'A+' : acc >= 70 ? 'A'
               : acc >= 60 ? 'B'  : acc >= 50 ? 'C'  : acc >= 35 ? 'D' : 'F';
  const trophy = acc >= 90 ? '🏆' : acc >= 70 ? '🥇' : acc >= 50 ? '🥈' : '🎯';
  const title  = acc >= 80 ? 'Excellent!' : acc >= 60 ? 'Well Done!'
               : acc >= 40 ? 'Good Try!'  : 'Keep Practising!';

  state.xp           += xpTotal;
  state.totalQ       += total;
  state.totalCorrect += quiz.correct;
  state.played       += 1;
  if (quiz.score > state.highScore) state.highScore = quiz.score;

  if (quiz.mode === 'level' && acc >= 60) {
    const key  = quiz.cls + '-' + quiz.subject;
    const prev = state.completedLevels[key] || 0;
    if (quiz.level > prev) state.completedLevels[key] = quiz.level;
  }

  saveState();

  $('resultTrophy').textContent = trophy;
  $('resultTitle').textContent  = title;
  $('resultGrade').textContent  = grade;
  $('rScore').textContent       = quiz.score;
  $('rCorrect').textContent     = quiz.correct;
  $('rWrong').textContent       = quiz.wrong;
  $('rAcc').textContent         = acc + '%';
  $('xpGained').textContent     = xpTotal;

  updateHeaderStats();
  showScreen('result');
}

/* ─── 14. LEVEL SELECT ──────────────────────────────────────────── */
const TOTAL_LEVELS = 24;

function openLevelSelect() {
  if (!quiz.subject) { showToast('⚠️ Please select a subject first!'); return; }

  const key  = quiz.cls + '-' + quiz.subject;
  const done = state.completedLevels[key] || 0;

  $('lvlXP').textContent          = state.xp;
  $('lvlClassName').textContent   = 'Class ' + quiz.cls;
  $('lvlSubjectName').textContent = quiz.subject;

  const grid = $('levelGrid');
  grid.innerHTML = '';

  for (let lv = 1; lv <= TOTAL_LEVELS; lv++) {
    const btn     = document.createElement('button');
    const isComp  = lv <= done;
    const isCurr  = lv === done + 1;
    const isLocked= lv > done + 1 && lv !== 1;

    btn.className = 'level-btn ' + (isComp ? 'completed unlocked' : isCurr ? 'current unlocked' : lv === 1 ? 'unlocked' : 'locked');
    btn.innerHTML = '<span class="lv-num">' + lv + '</span>'
                  + '<span class="lv-stars">' + (isComp ? '⭐⭐⭐' : isCurr ? '☆☆☆' : '🔒') + '</span>';

    if (!isLocked) btn.addEventListener('click', () => startQuiz('level', lv));
    grid.appendChild(btn);
  }

  showScreen('level');
}

/* ─── 15. LEADERBOARD ───────────────────────────────────────────── */
let lbTab = 'daily';

function openLeaderboard()  { renderLB(); $('leaderboardOverlay').classList.add('active'); }
function closeLeaderboard() { $('leaderboardOverlay').classList.remove('active'); }

function renderLB() {
  const list = lbTab === 'daily' ? state.leaderboard.daily.scores : state.leaderboard.alltime;
  if (!list || !list.length) {
    $('lbContent').innerHTML = '<p class="lb-empty">No scores yet — play a quiz!</p>';
    return;
  }
  $('lbContent').innerHTML = list.slice().sort((a,b) => b.score - a.score).slice(0, 10)
    .map((e, i) =>
      '<div class="lb-row">'
      + '<span class="lb-rank">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1) + '</span>'
      + '<span class="lb-name">'  + escHtml(e.name)  + '</span>'
      + '<span class="lb-score">' + e.score + '</span>'
      + '</div>'
    ).join('');
}

function addToLeaderboard(name, score) {
  const entry = { name, score, ts: Date.now() };
  state.leaderboard.daily.scores.push(entry);
  state.leaderboard.alltime.push(entry);
  if (state.leaderboard.alltime.length > 200)
    state.leaderboard.alltime = state.leaderboard.alltime.sort((a,b)=>b.score-a.score).slice(0,200);
  saveState();
}

/* ─── 16. HEADER STATS ──────────────────────────────────────────── */
function updateHeaderStats() {
  $('hXP').textContent   = state.xp;
  $('hBest').textContent = state.highScore;
  $('hAcc').textContent  = (state.totalQ > 0 ? Math.round(state.totalCorrect / state.totalQ * 100) : 0) + '%';
}

/* ─── 17. TOAST ─────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ─── 18. UTILITIES ─────────────────────────────────────────────── */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── 19. EVENT LISTENERS ───────────────────────────────────────── */
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    const mode = card.dataset.mode;
    if (mode === 'level') openLevelSelect();
    else startQuiz(mode);
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
  });
});

$('btnBackFromQuiz').addEventListener('click', () => {
  clearTimer();
  showScreen(quiz.mode === 'level' ? 'level' : 'home');
});
$('btnBackFromLevel').addEventListener('click', () => showScreen('home'));

$('btnPlayAgain').addEventListener('click', () => startQuiz(quiz.mode, quiz.mode === 'level' ? quiz.level : 1));
$('btnGoHome').addEventListener('click', () => { showScreen('home'); updateHeaderStats(); });

$('btnLeaderboard').addEventListener('click', openLeaderboard);
$('closeLeaderboard').addEventListener('click', closeLeaderboard);
$('leaderboardOverlay').addEventListener('click', e => {
  if (e.target === $('leaderboardOverlay')) closeLeaderboard();
});

document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    lbTab = tab.dataset.tab;
    renderLB();
  });
});

$('btnAddScore').addEventListener('click', () => {
  const name = $('lbNameInput').value.trim();
  if (!name)        { showToast('⚠️ Enter your name first!'); return; }
  if (!quiz.score)  { showToast('⚠️ Play a quiz first!');    return; }
  addToLeaderboard(name, quiz.score);
  $('lbNameInput').value = '';
  renderLB();
  showToast('✅ Score added!');
});

document.addEventListener('keydown', e => {
  if (!$('quizScreen').classList.contains('active')) return;
  if (!quiz.answered) {
    const map = { a:0, b:1, c:2, d:3, 1:0, 2:1, 3:2, 4:3 };
    const i   = map[e.key.toLowerCase()];
    if (i !== undefined) {
      const btns = document.querySelectorAll('.option-btn');
      if (btns[i]) btns[i].click();
    }
  } else if (e.key === 'Enter') {
    const nxt = $('btnNext');
    if (nxt.
