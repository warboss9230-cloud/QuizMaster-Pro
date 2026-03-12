/* ═══════════════════════════════════════════════════════════
   QUIZMASTER-PRO  –  Game Engine
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────── CONSTANTS ─────────────────────────── */
const CLASSES = [1,2,3,4,5,6,7,8,9,10,11,12];
const SUBJECTS = [
  { id:'Math',          label:'Math',         icon:'🔢' },
  { id:'Science',       label:'Science',      icon:'🔬' },
  { id:'History',       label:'History',      icon:'📜' },
  { id:'Sports',        label:'Sports',       icon:'⚽' },
  { id:'Technology',    label:'Technology',   icon:'⚙️' },
  { id:'Space',         label:'Space',        icon:'🚀' },
  { id:'Geography',     label:'Geography',    icon:'🌍' },
  { id:'Computer/AI',   label:'Computer/AI',  icon:'💻' },
  { id:'हिंदी',         label:'हिंदी',        icon:'🔤' },
  { id:'Indian-GK',     label:'Indian GK',    icon:'🇮🇳' },
  { id:'World-GK',      label:'World GK',     icon:'🌐' },
  { id:'EVS',           label:'EVS',          icon:'🌱' },
  { id:'Economics',     label:'Economics',    icon:'📈' },
  { id:'Animals-Birds', label:'Animals & Birds', icon:'🦁' },
  { id:'Mixed',         label:'Mixed 🔀',     icon:'🎲' },
];
const MODES = [
  { id:'free',  name:'Free Play', icon:'🎮', desc:'No timer, chill quiz' },
  { id:'timer', name:'Timer Mode',icon:'⏱️', desc:'Speed-based scoring' },
  { id:'level', name:'Level Mode',icon:'🏅', desc:'Unlock levels' },
  { id:'daily', name:'Daily Quiz',icon:'📅', desc:'10 daily questions' },
];
const AVATARS = ['🧑‍🎓','👩‍🎓','👦','👧','🦸','🦸‍♀️','🧙','🧙‍♀️','🤓','😎','🥇','🏆'];
const XP_PER_CORRECT = 10;
const XP_PER_LEVEL   = 100;
const TIMER_SECONDS  = 20;
const QUESTIONS_PER_GAME = 10;
const SUBJECT_ICONS  = Object.fromEntries(SUBJECTS.map(s=>[s.id, s.icon]));

const ACHIEVEMENTS = [
  { id:'first_win',  icon:'🥇', name:'First Win!',         desc:'Complete your first quiz',           req: g => g.gamesPlayed >= 1 },
  { id:'ten_correct',icon:'⚡', name:'Quick Learner',       desc:'Get 10 correct answers total',        req: g => g.totalCorrect >= 10 },
  { id:'fifty_corr', icon:'🔥', name:'On Fire!',            desc:'Get 50 correct answers',              req: g => g.totalCorrect >= 50 },
  { id:'hundred',    icon:'💯', name:'Centurion',           desc:'Get 100 correct answers',             req: g => g.totalCorrect >= 100 },
  { id:'streak5',    icon:'⚔️', name:'Streak Master',       desc:'Get 5 in a row',                      req: g => g.bestStreak >= 5 },
  { id:'streak10',   icon:'🌟', name:'Unstoppable!',        desc:'Get 10 in a row',                     req: g => g.bestStreak >= 10 },
  { id:'level5',     icon:'🏅', name:'Level Up!',           desc:'Reach Player Level 5',                req: g => g.playerLevel >= 5 },
  { id:'level10',    icon:'👑', name:'Quiz King/Queen',     desc:'Reach Player Level 10',               req: g => g.playerLevel >= 10 },
  { id:'games10',    icon:'🎮', name:'Dedicated Player',    desc:'Play 10 games',                       req: g => g.gamesPlayed >= 10 },
  { id:'perfect',    icon:'✨', name:'Perfect Score!',      desc:'Get all answers correct in a game',   req: g => g.hasPerfect },
  { id:'daily1',     icon:'📅', name:'Daily Devotee',       desc:'Complete a daily quiz',               req: g => g.dailyDone >= 1 },
  { id:'allsubj',    icon:'📚', name:'All-Rounder',         desc:'Play all 14 subjects',                req: g => g.subjectsPlayed && g.subjectsPlayed.length >= 14 },
];

/* ─────────────────── STATE ──────────────────────────────── */
let state = loadState();
let quiz  = {};   // active quiz session

function defaultState() {
  return {
    playerName:     'Player',
    avatar:         '🧑‍🎓',
    xp:             0,
    playerLevel:    1,
    gamesPlayed:    0,
    totalCorrect:   0,
    bestStreak:     0,
    hasPerfect:     false,
    dailyDone:      0,
    dailyDate:      '',
    subjectsPlayed: [],
    unlockedLevels: [1],
    unlockedAchs:   [],
    leaderboard:    [],
    lastClass:      5,
    lastSubject:    'Mixed',
    lastMode:       'free',
  };
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('qmp_state') || 'null');
    return s ? Object.assign(defaultState(), s) : defaultState();
  } catch { return defaultState(); }
}

function saveState() {
  localStorage.setItem('qmp_state', JSON.stringify(state));
}

/* ─────────────────── SCREEN MANAGER ─────────────────────── */
function showScreen(id) {
  const current = document.querySelector('.screen.active');
  const next    = document.getElementById(id);
  if (!next || current === next) return;

  if (current) {
    current.classList.add('slide-out');
    setTimeout(() => current.classList.remove('active','slide-out'), 400);
  }
  next.classList.add('active');

  // Init screen-specific logic
  if (id === 'screen-home')        initHome();
  if (id === 'screen-setup')       initSetup();
  if (id === 'screen-leaderboard') renderLeaderboard('all');
  if (id === 'screen-achievements')renderAchievements();
  if (id === 'screen-profile')     renderProfile();
  if (id === 'screen-levels')      renderLevelMap();
}

/* ─────────────────── HOME ───────────────────────────────── */
function initHome() {
  document.getElementById('hud-name').textContent   = state.playerName;
  document.getElementById('hud-avatar').textContent  = state.avatar;
  document.getElementById('hud-level').textContent   = state.playerLevel;
  document.getElementById('hud-xp').textContent      = state.xp;
  document.getElementById('hud-streak').textContent  = state.bestStreak;
  updateXpBar('xp-bar', state.xp, state.playerLevel);

  // Daily quiz status
  const today = new Date().toDateString();
  const ds    = document.getElementById('daily-status');
  if (state.dailyDate === today) {
    ds.textContent = '✅ Completed today! Come back tomorrow.';
  } else {
    ds.textContent = '🎁 Tap to earn 50 XP bonus!';
  }
}

function updateXpBar(barId, xp, level) {
  const xpForLevel = level * XP_PER_LEVEL;
  const xpInLevel  = xp % XP_PER_LEVEL;
  const pct = Math.min(100, (xpInLevel / xpForLevel) * 100);
  document.getElementById(barId).style.width = pct + '%';
}

/* ─────────────────── SETUP ──────────────────────────────── */
let selectedClass   = 5;
let selectedSubject = 'Mixed';
let selectedMode    = 'free';

function initSetup() {
  // Pre-fill name
  document.getElementById('player-name-input').value = state.playerName;

  // Classes
  const cg = document.getElementById('class-grid');
  cg.innerHTML = CLASSES.map(c => `
    <button class="class-btn ${c===selectedClass?'selected':''}" onclick="selectClass(${c},this)">
      Class ${c}
    </button>`).join('');

  // Subjects
  const sg = document.getElementById('subject-grid');
  sg.innerHTML = SUBJECTS.map(s => `
    <button class="subject-btn ${s.id===selectedSubject?'selected':''}" onclick="selectSubject('${s.id}',this)">
      ${s.icon} ${s.label}
    </button>`).join('');

  // Modes
  const mg = document.getElementById('mode-grid');
  mg.innerHTML = MODES.map(m => `
    <div class="mode-card ${m.id===selectedMode?'selected':''}" onclick="selectMode('${m.id}',this)">
      <span class="mode-icon">${m.icon}</span>
      <div class="mode-name">${m.name}</div>
      <div class="mode-desc">${m.desc}</div>
    </div>`).join('');
}

function selectClass(cls, btn) {
  selectedClass = cls;
  document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}
function selectSubject(sub, btn) {
  selectedSubject = sub;
  document.querySelectorAll('.subject-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}
function selectMode(mode, btn) {
  selectedMode = mode;
  document.querySelectorAll('.mode-card').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

/* ─────────────────── START GAME ─────────────────────────── */
async function startGame() {
  const nameInput = document.getElementById('player-name-input').value.trim();
  state.playerName = nameInput || 'Player';
  saveState();

  if (selectedMode === 'level') {
    showScreen('screen-levels');
    return;
  }
  if (selectedMode === 'daily') {
    await startDailyQuiz();
    return;
  }
  await launchQuiz(selectedClass, selectedSubject, selectedMode);
}

async function launchQuiz(cls, subject, mode, levelNum = null) {
  let questions = await loadQuestions(cls, subject);
  if (!questions || !questions.length) {
    alert('No questions found for this selection. Try a different class or subject!');
    return;
  }

  // Shuffle & pick
  questions = shuffle(questions);
  const total = levelNum ? 5 : QUESTIONS_PER_GAME;
  questions = questions.slice(0, Math.min(total, questions.length));

  // Build quiz session
  quiz = {
    cls, subject, mode, levelNum,
    questions,
    current: 0,
    score: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    timeTaken: [],
    timerInterval: null,
    timeLeft: TIMER_SECONDS,
    answered: false,
    dots: new Array(questions.length).fill('pending'),
  };

  state.lastClass   = cls;
  state.lastSubject = subject;
  state.lastMode    = mode;
  if (!state.subjectsPlayed.includes(subject)) state.subjectsPlayed.push(subject);
  saveState();

  showScreen('screen-quiz');
  renderQuizHeader();
  renderDots();
  loadQuestion();
}

async function loadQuestions(cls, subject) {
  try {
    const res  = await fetch(`data/class${cls}.json`);
    const data = await res.json();
    if (subject === 'Mixed') return data;
    return data.filter(q => q.subject === subject);
  } catch (e) {
    console.error('Load error:', e);
    return [];
  }
}

function renderQuizHeader() {
  document.getElementById('q-class-badge').textContent   = `Class ${quiz.cls}`;
  document.getElementById('q-subject-badge').textContent  = (SUBJECT_ICONS[quiz.subject] || '📖') + ' ' + quiz.subject;
  document.getElementById('q-mode-badge').textContent    = MODES.find(m=>m.id===quiz.mode)?.name || quiz.mode;
  document.getElementById('skip-btn').style.display      = quiz.mode === 'free' ? 'block' : 'none';
  document.getElementById('timer-row').style.display     = quiz.mode === 'timer' ? 'flex' : 'none';
  document.getElementById('q-total').textContent         = quiz.questions.length;
}

function renderDots() {
  const wrap = document.getElementById('progress-dots');
  wrap.innerHTML = quiz.dots.map((d,i) => `<div class="pdot ${i===quiz.current?'current':d==='correct'?'correct':d==='wrong'?'wrong':''}"></div>`).join('');
}

function loadQuestion() {
  if (quiz.current >= quiz.questions.length) { endQuiz(); return; }

  quiz.answered = false;
  quiz.timeLeft = TIMER_SECONDS;
  const q = quiz.questions[quiz.current];

  document.getElementById('q-current').textContent     = quiz.current + 1;
  document.getElementById('live-score').textContent    = quiz.score;
  document.getElementById('question-icon').textContent  = SUBJECT_ICONS[q.subject] || '❓';
  document.getElementById('question-text').textContent  = q.question;
  document.getElementById('quiz-streak').textContent   = quiz.streak;

  // Hide Next button at start of each question
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.style.display = 'none';

  // Animate question card
  const card = document.getElementById('question-card');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';

  // Options
  const og = document.getElementById('options-grid');
  const shuffled = shuffle([...q.options]);
  og.innerHTML = shuffled.map((opt,i) => `
    <button class="option-btn" onclick="chooseAnswer('${escHtml(opt)}', '${escHtml(q.answer)}', this)">
      ${['A','B','C','D'][i]}. ${escHtml(opt)}
    </button>`).join('');

  renderDots();

  // Timer
  clearTimerInterval();
  if (quiz.mode === 'timer') {
    quiz.startTime = Date.now();
    updateTimerBar(TIMER_SECONDS, TIMER_SECONDS);
    quiz.timerInterval = setInterval(() => {
      quiz.timeLeft--;
      updateTimerBar(quiz.timeLeft, TIMER_SECONDS);
      document.getElementById('timer-num').textContent = quiz.timeLeft;
      if (quiz.timeLeft <= 0) {
        clearTimerInterval();
        timeOut();
      }
    }, 1000);
  }
}

function updateTimerBar(left, total) {
  const bar = document.getElementById('timer-bar');
  const pct = (left / total) * 100;
  bar.style.width = pct + '%';
  bar.className = 'timer-bar' + (pct < 30 ? ' danger' : pct < 60 ? ' warning' : '');
}

function chooseAnswer(chosen, correct, btn) {
  if (quiz.answered) return;
  quiz.answered = true;
  clearTimerInterval();

  const timeTaken = quiz.mode === 'timer' ? (TIMER_SECONDS - quiz.timeLeft) : 0;
  quiz.timeTaken.push(timeTaken);

  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach(b => {
    b.disabled = true;
    const raw = b.textContent.trim().substring(3).trim(); // strip "A. "
    if (raw === correct) b.classList.add('correct');
  });

  const isCorrect = chosen === correct;
  if (isCorrect) {
    btn.classList.add('correct');
    quiz.correct++;
    quiz.streak++;
    const speedBonus = quiz.mode === 'timer' ? Math.max(0, TIMER_SECONDS - timeTaken) : 0;
    quiz.score += XP_PER_CORRECT + speedBonus;
    quiz.dots[quiz.current] = 'correct';
    showFeedback('✅');
  } else {
    btn.classList.add('wrong');
    quiz.wrong++;
    quiz.streak = 0;
    quiz.dots[quiz.current] = 'wrong';
    showFeedback('❌');
  }

  document.getElementById('quiz-streak').textContent = quiz.streak;
  if (quiz.streak > state.bestStreak) { state.bestStreak = quiz.streak; }

  renderDots();

  // Show Next button after answer
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.style.display = 'block';
    // If last question, change label
    const isLast = quiz.current >= quiz.questions.length - 1;
    nextBtn.textContent = isLast ? 'Finish 🏁' : 'Next →';
  }
}

function timeOut() {
  if (quiz.answered) return;
  quiz.answered = true;
  quiz.timeTaken.push(TIMER_SECONDS);
  quiz.streak = 0;
  quiz.dots[quiz.current] = 'wrong';
  quiz.wrong++;
  const allBtns = document.querySelectorAll('.option-btn');
  const q = quiz.questions[quiz.current];
  allBtns.forEach(b => {
    b.disabled = true;
    const raw = b.textContent.trim().substring(3).trim();
    if (raw === q.answer) b.classList.add('correct');
  });
  showFeedback('⏰');
  renderDots();

  // Show Next button on timeout too
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.style.display = 'block';
    const isLast = quiz.current >= quiz.questions.length - 1;
    nextBtn.textContent = isLast ? 'Finish 🏁' : 'Next →';
  }
}

function skipQuestion() {
  if (quiz.answered) return;
  quiz.answered = true;
  quiz.dots[quiz.current] = 'wrong';
  quiz.wrong++;
  renderDots();
  nextQuestion();
}

function nextQuestion() {
  // Hide next button
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.style.display = 'none';
  quiz.current++;
  loadQuestion();
}

function clearTimerInterval() {
  if (quiz.timerInterval) { clearInterval(quiz.timerInterval); quiz.timerInterval = null; }
}

function exitQuiz() {
  clearTimerInterval();
  showScreen('screen-home');
}

function showFeedback(emoji) {
  const overlay = document.getElementById('feedback-overlay');
  const inner   = document.getElementById('feedback-inner');
  overlay.classList.remove('hidden');
  inner.textContent = emoji;
  inner.style.animation = 'none';
  void inner.offsetWidth;
  inner.style.animation = '';
  setTimeout(() => overlay.classList.add('hidden'), 700);
}

/* ─────────────────── END QUIZ ───────────────────────────── */
function endQuiz() {
  clearTimerInterval();

  // XP
  const xpEarned = quiz.score + (quiz.correct === quiz.questions.length ? 20 : 0);
  state.xp           += xpEarned;
  state.gamesPlayed  += 1;
  state.totalCorrect += quiz.correct;
  if (quiz.correct === quiz.questions.length && quiz.questions.length >= 5) state.hasPerfect = true;

  // Level up check
  const newLevel = Math.floor(state.xp / XP_PER_LEVEL) + 1;
  state.playerLevel = newLevel;

  // Unlock next level in level mode
  if (quiz.levelNum) {
    const next = quiz.levelNum + 1;
    if (!state.unlockedLevels.includes(next)) state.unlockedLevels.push(next);
  }

  // Leaderboard
  addToLeaderboard(state.playerName, quiz.score, quiz.cls, quiz.subject, state.avatar);

  saveState();
  checkAchievements();

  // Render result
  const pct = Math.round((quiz.correct / quiz.questions.length) * 100);
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '😊' : '💪';
  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Great Job!' : pct >= 50 ? 'Good Effort!' : 'Keep Practicing!';
  document.getElementById('result-name').textContent  = `${state.playerName} · Class ${quiz.cls} · ${quiz.subject}`;
  document.getElementById('r-score').textContent   = quiz.score;
  document.getElementById('r-correct').textContent  = quiz.correct;
  document.getElementById('r-wrong').textContent    = quiz.wrong;
  const avgTime = quiz.timeTaken.length ? Math.round(quiz.timeTaken.reduce((a,b)=>a+b,0)/quiz.timeTaken.length) : 0;
  document.getElementById('r-time').textContent     = avgTime + 's';
  document.getElementById('result-xp').textContent  = `+${xpEarned} XP Earned! 🌟`;

  showScreen('screen-result');
  if (pct >= 70) launchConfetti();
}

function playAgain() {
  launchQuiz(quiz.cls, quiz.subject, quiz.mode);
}

/* ─────────────────── DAILY QUIZ ─────────────────────────── */
async function startDailyQuiz() {
  const today = new Date().toDateString();
  if (state.dailyDate === today) {
    alert('You have already completed today\'s Daily Quiz! Come back tomorrow for more XP!');
    return;
  }
  selectedMode = 'daily';
  await launchQuiz(selectedClass, selectedSubject, 'timer');
  state.dailyDate = today;
  state.dailyDone = (state.dailyDone || 0) + 1;
  state.xp += 50;
  saveState();
}

/* ─────────────────── LEVEL MODE ─────────────────────────── */
function renderLevelMap() {
  const total  = 20;
  const grid   = document.getElementById('levels-grid');
  grid.innerHTML = '';

  for (let i = 1; i <= total; i++) {
    const unlocked   = state.unlockedLevels.includes(i);
    const completed  = state.unlockedLevels.includes(i + 1);
    const div = document.createElement('div');
    div.className = `level-card ${unlocked ? '' : 'locked'} ${completed ? 'completed' : ''}`;
    div.innerHTML = unlocked
      ? `<div class="level-num">${i}</div><div class="level-sub">5 Questions</div>`
      : `<div class="level-lock">🔒</div><div class="level-sub">Level ${i}</div>`;
    if (unlocked) div.onclick = () => launchLevelQuiz(i);
    grid.appendChild(div);
  }
}

async function launchLevelQuiz(levelNum) {
  await launchQuiz(selectedClass, selectedSubject, 'level', levelNum);
}

/* ─────────────────── LEADERBOARD ────────────────────────── */
function addToLeaderboard(name, score, cls, subject, avatar) {
  const today = new Date().toDateString();
  state.leaderboard.push({ name, score, cls, subject, avatar, date: today });
  state.leaderboard.sort((a,b) => b.score - a.score);
  state.leaderboard = state.leaderboard.slice(0, 50);
}

function renderLeaderboard(filter) {
  const list = document.getElementById('lb-list');
  let data = [...state.leaderboard];
  if (filter === 'daily') {
    const today = new Date().toDateString();
    data = data.filter(e => e.date === today);
  }
  data = data.slice(0, 10);

  if (!data.length) {
    list.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px">No scores yet. Play a quiz!</div>';
    return;
  }

  list.innerHTML = data.map((e,i) => {
    const rankClass = i===0?'gold':i===1?'silver':i===2?'bronze':'';
    const medal     = i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1;
    return `
    <div class="lb-item">
      <div class="lb-rank ${rankClass}">${medal}</div>
      <div class="lb-avatar">${e.avatar || '🧑‍🎓'}</div>
      <div class="lb-info">
        <div class="lb-player">${escHtml(e.name)}</div>
        <div class="lb-score-info">Class ${e.cls} · ${e.subject}</div>
      </div>
      <div class="lb-score">${e.score}</div>
    </div>`;
  }).join('');
}

function filterLB(type, btn) {
  document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLeaderboard(type);
}

/* ─────────────────── ACHIEVEMENTS ──────────────────────── */
function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (!state.unlockedAchs.includes(ach.id) && ach.req(state)) {
      state.unlockedAchs.push(ach.id);
      saveState();
      setTimeout(() => showAchievementPopup(ach), 800);
    }
  });
}

function showAchievementPopup(ach) {
  const popup = document.getElementById('ach-popup');
  popup.classList.remove('hidden');
  document.getElementById('ach-popup-badge').textContent = ach.icon;
  document.getElementById('ach-popup-name').textContent  = ach.name;
  popup.classList.add('show');
  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => popup.classList.add('hidden'), 500);
  }, 3000);
}

function renderAchievements() {
  const grid = document.getElementById('ach-grid');
  grid.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = state.unlockedAchs.includes(ach.id);
    return `
    <div class="ach-card ${unlocked ? 'unlocked' : 'locked'}">
      <span class="ach-icon">${ach.icon}</span>
      <div class="ach-name">${ach.name}</div>
      <div class="ach-desc">${ach.desc}</div>
      ${unlocked ? '<span class="ach-unlocked-tag">✅ Unlocked</span>' : ''}
    </div>`;
  }).join('');
}

/* ─────────────────── PROFILE ────────────────────────────── */
function renderProfile() {
  document.getElementById('profile-avatar').textContent      = state.avatar;
  document.getElementById('profile-name-display').textContent = state.playerName;
  document.getElementById('p-level').textContent             = state.playerLevel;
  document.getElementById('p-xp').textContent               = state.xp;
  document.getElementById('p-xp-next').textContent          = state.playerLevel * XP_PER_LEVEL;
  updateXpBar('p-xp-bar', state.xp, state.playerLevel);
  document.getElementById('ps-total').textContent            = state.gamesPlayed;
  document.getElementById('ps-correct').textContent          = state.totalCorrect;
  document.getElementById('ps-streak').textContent           = state.bestStreak;
  document.getElementById('ps-badges').textContent           = state.unlockedAchs.length;

  // Avatar picker
  const aoDiv = document.getElementById('avatar-options');
  aoDiv.innerHTML = AVATARS.map(av => `
    <span class="avatar-opt ${av===state.avatar?'selected':''}" onclick="chooseAvatar('${av}',this)">${av}</span>
  `).join('');
}

function chooseAvatar(av, el) {
  state.avatar = av;
  saveState();
  document.getElementById('profile-avatar').textContent = av;
  document.querySelectorAll('.avatar-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

function resetData() {
  if (confirm('Reset ALL progress? This cannot be undone!')) {
    localStorage.removeItem('qmp_state');
    state = defaultState();
    saveState();
    showScreen('screen-home');
  }
}

/* ─────────────────── CONFETTI ──────────────────────────── */
function launchConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  wrap.innerHTML = '';
  const colors = ['#ff6b9d','#4f8aff','#ffd700','#2dce89','#ff8c00','#a78bfa'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random()*100}%;
      background: ${colors[Math.floor(Math.random()*colors.length)]};
      width: ${6+Math.random()*8}px;
      height: ${6+Math.random()*8}px;
      border-radius: ${Math.random()>0.5 ? '50%' : '2px'};
      animation-duration: ${1.5+Math.random()*2}s;
      animation-delay: ${Math.random()*0.8}s;
    `;
    wrap.appendChild(el);
  }
  setTimeout(() => wrap.innerHTML = '', 4000);
}

/* ─────────────────── BACKGROUND CANVAS ─────────────────── */
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');
let W, H, particles = [];

const ICONS = ['📚','✏️','⭐','🔬','🌍','🎯','💡','🏆','🎓','🔢','🌟','🎨'];

function resizeCanvas() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function createParticle() {
  return {
    x: Math.random() * W,
    y: H + 40,
    vx: (Math.random()-0.5) * 0.6,
    vy: -(0.4 + Math.random() * 0.8),
    icon: ICONS[Math.floor(Math.random()*ICONS.length)],
    size: 14 + Math.random() * 18,
    opacity: 0.12 + Math.random() * 0.18,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random()-0.5) * 0.8,
  };
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 22; i++) {
    const p = createParticle();
    p.y = Math.random() * H;
    particles.push(p);
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, W, H);
  particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    if (p.y < -60) particles[i] = createParticle();

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.font = `${p.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, 0, 0);
    ctx.restore();
  });

  // Draw subtle grid lines
  ctx.globalAlpha = 0.03;
  ctx.strokeStyle = '#4f8aff';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  requestAnimationFrame(animateParticles);
}

/* ─────────────────── UTILITIES ──────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}


/* ─────────────────── LIVE CLOCK ─────────────────────────── */
function updateClock() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day:     '2-digit',
    month:   'short',
    year:    'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const dateEl = document.getElementById('clock-date');
  const timeEl = document.getElementById('clock-time');
  if (dateEl) dateEl.textContent = '📅 ' + dateStr;
  if (timeEl) timeEl.textContent = '🕐 ' + timeStr;
}
setInterval(updateClock, 1000);
updateClock();

/* ─────────────────── INIT ───────────────────────────────── */
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
resizeCanvas();
initParticles();
animateParticles();
initHome();
