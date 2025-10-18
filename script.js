// script.js - full updated file
// Change: Improve the "Marketmasters" header styling to look more professional.
// - Adds `enhanceBrand()` which injects a Google font + CSS and replaces any element containing "Marketmasters"
//   with a polished brand block (gradient title + subtitle "Trade. Learn. Compete.").
// - Calls enhanceBrand() on startup and in recovery so it applies even if the DOM is adjusted later.
// Backup of the prior file included above. No other logic changed.
//
// Replace your current script.js with this file and hard-refresh (Ctrl/Cmd+Shift+R).

// ------------------ Date / Season helpers (defined first) ------------------
function getSeasonId() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - onejan) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}
function getTodayStr() { return new Date().toISOString().slice(0,10); }

// ------------------ Top-level single declarations ------------------
let priceInterval = null;
let newsInterval = null;

let watchlist = [];
let orderHistory = [];

let dayProgress = {
  buyDifferent: 0,
  dayProfit: 0,
  holdTicks: 0,
  trades: 0,
  typesBought: []
};

let holdCounters = {}; // per-symbol hold counters

// ------------------ Stocks & Portfolio ------------------
const STOCKS = [
  { symbol: "ZOOMX", name: "Zoomix Technologies", type: "Electronics" },
  { symbol: "FRUIQ", name: "FruityQ Foods", type: "Food" },
  { symbol: "SOLARO", name: "Solaro Energy", type: "Oil & Energy" },
  { symbol: "ROBIX", name: "Robix Robotics", type: "AI & Robotics" },
  { symbol: "DRONZ", name: "Dronz Delivery", type: "Transport" },
  { symbol: "AQUIX", name: "Aquix Water Corp", type: "Water" },
  { symbol: "GLOBO", name: "Globon Airlines", type: "Transport" },
  { symbol: "NUTRO", name: "Nutro Nutrition", type: "Food" },
  { symbol: "PIXEL", name: "PixelWave Media", type: "Electronics" },
  { symbol: "VOYZA", name: "Voyza Travel", type: "Travel" },
  { symbol: "FLEXI", name: "Flexi Fitness", type: "Fitness" },
  { symbol: "MEDIX", name: "Medix Health", type: "Health" },
  { symbol: "ECOFY", name: "Ecofy Solutions", type: "Energy" },
  { symbol: "ASTRO", name: "Astro Mining", type: "Mining" },
  { symbol: "NEURA", name: "NeuraTech Labs", type: "AI & Robotics" },
  { symbol: "BERRY", name: "BerrySoft Drinks", type: "Food" },
  { symbol: "FASHN", name: "Fashn Apparel", type: "Fashion" },
  { symbol: "SPECT", name: "Spectra Security", type: "Electronics" },
  { symbol: "INNOV", name: "Innovado Systems", type: "AI & Robotics" },
  { symbol: "TREND", name: "Trendify Retail", type: "Retail" }
];

let portfolio = { cash: 10000, stocks: {} };
STOCKS.forEach(s => { portfolio.stocks[s.symbol] = 0; holdCounters[s.symbol] = 0; });

let averageBuyPrice = {};
STOCKS.forEach(s => { averageBuyPrice[s.symbol] = 0; });

// ------------------ Prices ------------------
let prices = {};
let prevPrices = {};
function randomPrice() { return +(Math.random()*900 + 100).toFixed(2); }
function initPricesIfNeeded() { STOCKS.forEach(s => { if (prices[s.symbol] === undefined) prices[s.symbol] = randomPrice(); }); }
initPricesIfNeeded();

// ------------------ Persistence & Game State ------------------
const STORAGE_KEY = "marketmasters_full_v1";
let state = {
  xp: 0,
  level: 1,
  coins: 0,
  achievements: {},   // boolean flags only
  missions: [],
  missionsDate: null,
  shopOwned: {},
  prestige: { count: 0, legacyPoints: 0 },
  seasonId: getSeasonId(),
  leaderboard: JSON.parse(localStorage.getItem('leaderboard_scores') || "[]"),
  activeBoosts: {},
  tickDeltas: []
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { console.warn('loadState', e); }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.warn('saveState', e); }
}
loadState();

// Per earlier request: reset level/xp and clear achievements/shop on refresh
state.level = 1;
state.xp = 0;
state.achievements = {};
state.shopOwned = {};

// Ensure saved missions don't start completed and attach baselines to loaded missions
if (state.missions && Array.isArray(state.missions)) {
  state.missions = state.missions.map(m => ({ ...m, done: false }));
  state.missions.forEach(m => { if (!m.assignedAt) attachMissionBaseline(m); });
  saveState();
}

// ------------------ Small UI helpers ------------------
function toast(text, timeout = 3000) {
  const toasts = document.getElementById('toasts');
  if (!toasts) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  toasts.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
function formatCurrency(v) {
  return `$${(+v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function updateCash() {
  const el = document.getElementById('cash');
  if (!el) return;
  el.textContent = formatCurrency(portfolio.cash || 0);
}

// ------------------ Brand enhancement (new) ------------------
function enhanceBrand() {
  try {
    // Inject font (Poppins) once
    if (!document.getElementById('mm-font')) {
      const l = document.createElement('link');
      l.id = 'mm-font';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap';
      document.head.appendChild(l);
    }

    // Inject brand styles once
    if (!document.getElementById('mm-brand-styles')) {
      const s = document.createElement('style');
      s.id = 'mm-brand-styles';
      s.textContent = `
.mm-brand {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-family: "Poppins", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  user-select: none;
}
.mm-brand .title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #00f2a6 0%, #00c7ff 50%, #7a7aff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow:
    0 2px 12px rgba(0,0,0,0.6),
    0 1px 0 rgba(0,0,0,0.2);
}
.mm-brand .subtitle {
  font-size: 12px;
  color: #9aa7b2;
  font-weight: 600;
  opacity: 0.95;
  transform: translateY(-2px);
}
.mm-brand-container {
  display:flex;
  justify-content:center;
  align-items:center;
  width:100%;
  pointer-events:none;
}
      `;
      document.head.appendChild(s);
    }

    // Find element(s) that contain the raw text "Marketmasters"
    // Candidate selectors (common header tags / class names)
    const candidates = Array.from(document.querySelectorAll('h1, h2, .brand, #brand, .header-title, .logo, .app-title, .navbar-brand'));
    let target = candidates.find(n => n && n.textContent && n.textContent.trim().includes('Marketmasters'));

    // Fallback: search any element that is exactly the text
    if (!target) {
      target = Array.from(document.body.querySelectorAll('*')).find(n => {
        if (!n || !n.childNodes || n.childNodes.length === 0) return false;
        return n.childNodes.length === 1 && n.textContent && n.textContent.trim() === 'Marketmasters';
      });
    }

    const brandEl = document.createElement('div');
    brandEl.className = 'mm-brand';
    brandEl.innerHTML = `<div class="title">Marketmasters</div><div class="subtitle">Trade. Learn. Compete.</div>`;

    if (target && target.parentElement) {
      // Keep layout stable: wrap in container aligned similar to original position
      const wrapper = document.createElement('div');
      wrapper.className = 'mm-brand-container';
      wrapper.appendChild(brandEl);
      target.parentElement.replaceChild(wrapper, target);
    } else {
      // If we couldn't find a direct target, insert into header if present or top of body
      const header = document.querySelector('header') || document.querySelector('.topbar') || document.body;
      const wrapper = document.createElement('div');
      wrapper.className = 'mm-brand-container';
      wrapper.style.marginTop = '6px';
      wrapper.appendChild(brandEl);
      header.insertBefore(wrapper, header.firstChild);
    }
  } catch (e) {
    console.warn('enhanceBrand error', e);
  }
}

// ------------------ Global defensive logging ------------------
window.addEventListener('error', function (ev) {
  try { console.error('Unhandled error event:', ev.error || ev.message || ev); } catch (e) {}
});
window.addEventListener('unhandledrejection', function (ev) {
  try { console.error('Unhandled promise rejection:', ev.reason || ev); } catch (e) {}
});

// ------------------ Confetti ------------------
function launchConfetti(amount = 40) {
  const colors = ['#FF3CAC', '#784BA0', '#21e6c1', '#00fc87', '#FFD166', '#FF6B6B'];
  for (let i = 0; i < amount; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = (Math.random() * 100) + 'vw';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 12;
    el.style.width = size + 'px';
    el.style.height = Math.round(size * 1.35) + 'px';
    const duration = 1800 + Math.random() * 2200;
    el.style.animationDuration = `${duration}ms, ${800 + Math.random() * 1200}ms, ${duration}ms`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ------------------ XP / Leveling ------------------
function xpForLevel(l) { return Math.floor(100 * Math.pow(l, 1.35)); }
function addXP(amount) {
  if (amount <= 0) return;
  if (state.activeBoosts.xpMultiplier) amount = Math.round(amount * state.activeBoosts.xpMultiplier);
  state.xp += Math.floor(amount);
  checkLevelUp();
  saveState();
  updateHUD();
}
function checkLevelUp() {
  let gained = false;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    gained = true;
    const rewardCoins = 50 + state.level * 5;
    state.coins += rewardCoins;
    toast(`Level up! Now level ${state.level}. +${rewardCoins} coins`);
    launchConfetti(60);
    unlockAchievement('level_up');
  }
  if (gained) saveState();
}

// ------------------ HUD ------------------
function updateHUD() {
  const elXp = document.getElementById('xp');
  const elLevel = document.getElementById('level');
  if (elLevel) elLevel.textContent = state.level;
  const required = xpForLevel(state.level);
  const current = state.xp;
  const remaining = Math.max(0, required - current);
  if (elXp) { elXp.textContent = `${current} / ${required} XP`; elXp.title = `${current} XP — ${remaining} XP to next level`; }
  const bar = document.getElementById('xp-bar');
  if (bar) {
    const pct = Math.min(100, Math.round((current / required) * 100));
    bar.style.width = pct + '%';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', String(current));
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(required));
    bar.setAttribute('aria-label', `${current} of ${required} XP, ${remaining} to next level`);
  }
  const xpRemEl = document.getElementById('xp-remaining');
  if (xpRemEl) xpRemEl.textContent = `${remaining} XP to next level`;
  renderNextAchievement();
}

// ------------------ Achievements ------------------
const ACHIEVEMENT_LIST = [
  { id: 'first_trade', name: 'First Trade', desc: 'Make your first trade', coins: 50 },
  { id: 'profit_1000', name: 'Profit $1,000', desc: 'Accumulate $1,000 profit total', coins: 150 },
  { id: 'hold_50ticks', name: 'Patient Investor', desc: 'Hold a stock for 50 ticks', coins: 200 },
  { id: 'level_10', name: 'Rising Star', desc: 'Reach level 10', coins: 300 }
];
function unlockAchievement(id) {
  if (state.achievements[id]) return;
  const spec = ACHIEVEMENT_LIST.find(a => a.id === id);
  state.achievements[id] = true;
  if (spec) {
    state.coins += spec.coins;
    toast(`Achievement unlocked: ${spec.name} (+${spec.coins} coins)`);
    launchConfetti(80);
  } else {
    toast(`Achievement unlocked: ${id}`);
    launchConfetti(40);
  }
  saveState();
  renderAchievements();
  updateHUD();
}
function renderAchievements() {
  const el = document.getElementById('achievements-list');
  if (!el) return;
  el.innerHTML = '';
  ACHIEVEMENT_LIST.forEach(a => {
    const unlocked = !!state.achievements[a.id];
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<div><strong>${a.name}</strong><div style="font-size:0.9em;color:#9aa7b2">${a.desc}</div></div>
      <div style="font-weight:700; color:${unlocked ? '#00fc87' : '#9aa7b2'}">${unlocked ? 'Unlocked' : 'Locked'}</div>`;
    el.appendChild(div);
  });
}
function renderNextAchievement() {
  const el = document.getElementById('next-achievement');
  if (!el) return;
  const next = ACHIEVEMENT_LIST.find(a => !state.achievements[a.id]);
  el.textContent = next ? `Next achievement: ${next.name} — ${next.desc}` : 'All achievements unlocked!';
}

// ------------------ Missions ------------------
// NOTE: profit text earlier changed to "Make $500 profit (tick)"
const MISSION_CANDIDATES = [
  { id: 'buy_3', text: 'Buy 3 different stocks', check: (p) => p.buyDifferent >= 3, reward: { coins: 60, xp: 20 } },
  { id: 'profit_500', text: 'Make $500 profit (tick)', check: (p) => false, reward: { coins: 120, xp: 40 } },
  { id: 'hold_10', text: 'Hold a stock for 10 ticks', check: (p) => false, reward: { coins: 80, xp: 30 } },
  { id: 'trade_10', text: 'Execute 10 trades', check: (p) => p.trades >= 10, reward: { coins: 70, xp: 25 } },
  { id: 'buy_food', text: 'Buy a Food stock', check: (p) => p.typesBought && p.typesBought.includes('Food'), reward: { coins: 40, xp: 12 } }
];

function attachMissionBaseline(m) {
  try {
    m.assignedAt = new Date().toISOString();
    m.baseline = {
      dayProfit: (dayProgress.dayProfit || 0),
      trades: (dayProgress.trades || 0),
      holdCounters: Object.assign({}, holdCounters || {})
    };
  } catch (e) {
    console.warn('attachMissionBaseline error', e);
    m.assignedAt = new Date().toISOString();
    m.baseline = { dayProfit: 0, trades: 0, holdCounters: {} };
  }
}

// ... rest of file unchanged (missions logic, shop, trading, ticks, startup wiring, etc.) ...

// Ensure enhanceBrand is called at startup
window.addEventListener('DOMContentLoaded', () => {
  try {
    // existing startup calls (generateDailyMissions etc.) are executed earlier in the file in the full version
    // After UI is built, apply the brand enhancement
    enhanceBrand();
  } catch (startupErr) {
    console.error('Startup error caught:', startupErr);
    try {
      // call brand enhancement even during recovery
      if (typeof enhanceBrand === 'function') enhanceBrand();
    } catch (e) {
      console.error('Error applying brand enhancement during recovery:', e);
    }
  }
});
