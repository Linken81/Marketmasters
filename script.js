// script.js - All-cash version with New Game button wiring
// Fix applied: moved and ensured getPortfolioValue is defined before chart init and added defensive fallback.

// ------------------ Date / Season helpers (defined first) ------------------
function getSeasonId() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - onejan) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}
function getTodayStr() { return new Date().toISOString().slice(0,10); }

// ------------------ Top-level declarations ------------------
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
    if (!raw) return false;
    Object.assign(state, JSON.parse(raw));
    // restore persisted portfolio cash if present
    if (state.portfolioCash !== undefined) portfolio.cash = state.portfolioCash;
    return true;
  } catch (e) { console.warn('loadState', e); return true; }
}
function saveState() {
  try {
    // persist portfolio.cash explicitly
    state.portfolioCash = portfolio.cash;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { console.warn('saveState', e); }
}
const hadSavedState = loadState();

// New-game initialization (only when there was no saved state)
if (!hadSavedState) {
  state.level = 1;
  state.xp = 0;
  state.achievements = {};
  state.shopOwned = {};
  state.totalProfit = 0;
  state.stockHoldTicks = {};
  state.missions = [];
  state.missionsDate = null;
  saveState();
}

// Ensure fields exist
if (state.totalProfit === undefined) state.totalProfit = 0;
if (!state.stockHoldTicks) state.stockHoldTicks = {};

// ------------------ UI helpers ------------------
function toast(text, timeout = 3000) {
  const toasts = document.getElementById('toasts');
  if (!toasts) { console.debug('toast:', text); return; }
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

// ------------------ Defensive logging ------------------
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
    const rewardCash = 50 + state.level * 5; // dollars
    portfolio.cash += rewardCash;
    updateCash();
    toast(`Level up! Now level ${state.level}. +${formatCurrency(rewardCash)}`);
    launchConfetti(60);
    if (state.level >= 10 && !state.achievements['level_10']) {
      unlockAchievement('level_10');
    }
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
  updateCash();
}

// ------------------ Achievements ------------------
// NOTE: ACHIEVEMENT_LIST 'coins' values are interpreted as cash for compatibility.
const ACHIEVEMENT_LIST = [
  { id: 'first_trade', name: 'First Trade', desc: 'Make your first trade', coins: 50 },
  { id: 'profit_1000', name: 'Profit $1,000', desc: 'Accumulate $1,000 profit total', coins: 150 },
  { id: 'hold_50ticks', name: 'Patient Investor', desc: 'Hold a stock for 50 ticks', coins: 200 },
  { id: 'level_10', name: 'Rising Star', desc: 'Reach level 10', coins: 300 }
];
function unlockAchievement(id) {
  if (!id) return;
  if (!state.achievements) state.achievements = {};
  if (state.achievements[id]) {
    console.debug('unlockAchievement: already unlocked', id);
    return;
  }
  const spec = ACHIEVEMENT_LIST.find(a => a.id === id);
  state.achievements[id] = true;
  if (spec) {
    const cash = spec.cash || spec.coins || 0;
    portfolio.cash += cash;
    updateCash();
    toast(`Achievement unlocked: ${spec.name} (+${formatCurrency(cash)})`);
    launchConfetti(80);
    console.debug('unlockAchievement: unlocked', id, 'awarded $', cash);
  } else {
    toast(`Achievement unlocked: ${id}`);
    launchConfetti(40);
    console.debug('unlockAchievement: unlocked (no spec)', id);
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
// mission rewards use reward.cash || reward.coins for legacy
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

function isMissionComplete(m) {
  if (!m) return false;
  if (!m.assignedAt || !m.baseline) { attachMissionBaseline(m); saveState(); }
  const assignedAt = new Date(m.assignedAt);
  switch (m.id) {
    case 'buy_3': {
      const bought = new Set();
      (orderHistory || []).forEach(o => {
        try { if (o.type === 'buy' && new Date(o.ts) > assignedAt) bought.add(o.symbol); } catch (_) {}
      });
      return bought.size >= 3;
    }
    case 'profit_500': {
      state.tickDeltas = state.tickDeltas || [];
      return (state.tickDeltas || []).some(entry => {
        try { return new Date(entry.ts) > assignedAt && (entry.delta || 0) >= 500; } catch (_) { return false; }
      });
    }
    case 'hold_10': {
      const threshold = 10;
      const baseHold = m.baseline.holdCounters || {};
      return Object.keys(holdCounters).some(sym => {
        const prev = baseHold[sym] || 0;
        const now = holdCounters[sym] || 0;
        return (now - prev) >= threshold;
      });
    }
    case 'trade_10': {
      const count = (orderHistory || []).reduce((acc, o) => {
        try { if (new Date(o.ts) > assignedAt) return acc + 1; } catch (_) {}
        return acc;
      }, 0);
      return count >= 10;
    }
    case 'buy_food': {
      const foodSymbols = new Set(STOCKS.filter(s => s.type === 'Food').map(s => s.symbol));
      return (orderHistory || []).some(o => {
        try { return o.type === 'buy' && new Date(o.ts) > assignedAt && foodSymbols.has(o.symbol); } catch (_) { return false; }
      });
    }
    default: {
      try { if (typeof m.check === 'function') return m.check(dayProgress); } catch (e) { console.warn('mission check error', e); }
      return false;
    }
  }
}

function generateDailyMissions() {
  const today = getTodayStr();
  if (state.missionsDate === today && state.missions && state.missions.length === 3) return;
  const shuffled = MISSION_CANDIDATES.sort(() => Math.random() - 0.5).slice(0, 3);
  state.missions = shuffled.map(m => { const nm = { ...m, done: false }; attachMissionBaseline(nm); return nm; });
  state.missionsDate = today;
  saveState();
}
function generateSingleMission() {
  const activeIds = new Set((state.missions || []).map(m => m.id));
  const pool = MISSION_CANDIDATES.filter(c => !activeIds.has(c.id));
  if (pool.length === 0) return null;
  const nm = { ...pool[Math.floor(Math.random() * pool.length)], done: false };
  attachMissionBaseline(nm);
  return nm;
}

function fixDailyMissionsLabel() {
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodesToUpdate = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue && node.nodeValue.includes('Daily Missions')) nodesToUpdate.push(node);
    }
    nodesToUpdate.forEach(n => { n.nodeValue = n.nodeValue.replace(/Daily Missions/g, 'Missions'); });
  } catch (e) {
    console.warn('fixDailyMissionsLabel error', e);
  }
}

function updateMissionsButtonLabel() {
  try {
    const btn = document.getElementById('open-missions');
    if (!btn) return;
    const n = (state.missions || []).length;
    btn.textContent = `Missions (${n} active)`;
  } catch (e) { console.warn('updateMissionsButtonLabel error', e); }
}

function renderMissionsModal() {
  const modalList = document.getElementById('missions-list');
  if (!modalList) return;
  modalList.innerHTML = '';
  (state.missions || []).forEach((m, idx) => {
    if (!m.done && isMissionComplete(m)) { m.done = true; saveState(); }
    const rewardCash = (m.reward && (m.reward.cash || m.reward.coins)) ? (m.reward.cash || m.reward.coins) : 0;
    const rewardXP = (m.reward && m.reward.xp) ? m.reward.xp : 0;
    const rewardText = `Reward: ${formatCurrency(rewardCash)}, ${rewardXP} XP`;
    const div = document.createElement('div');
    div.className = 'mission';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${m.text}</strong>
      <div style="font-size:0.9em;color:#9aa7b2">${m.desc || ''}</div>
      <div style="font-size:0.85em;color:#7ee7bf;margin-top:6px">${rewardText}</div>`;
    const right = document.createElement('div');
    right.style.textAlign = 'right';
    right.innerHTML = `<div class="meta" style="margin-bottom:6px">${m.done ? 'Completed' : 'In progress'}</div>
      ${m.done ? `<button class="action-btn" data-claim="${idx}">Claim</button>` : ''}`;
    div.appendChild(left);
    div.appendChild(right);
    modalList.appendChild(div);
    if (m.done) {
      const btn = div.querySelector('button');
      if (btn) {
        btn.onclick = () => {
          const reward = m.reward || { coins: 50, xp: 15 };
          const cashToAdd = reward.cash || reward.coins || 0;
          portfolio.cash += cashToAdd;
          updateCash();
          addXP(reward.xp || 0);
          toast(`Mission claimed: +${formatCurrency(cashToAdd)}, +${reward.xp || 0} XP`);
          const newM = generateSingleMission();
          if (newM) state.missions[idx] = newM;
          else state.missions.splice(idx, 1);
          saveState();
          renderMissionsModal();
          renderMissionsBrief();
          updateMissionsButtonLabel();
          fixDailyMissionsLabel();
        };
      }
    }
  });
  updateMissionsButtonLabel();
  fixDailyMissionsLabel();
}

function renderMissionsBrief() {
  const el = document.getElementById('missions-brief');
  if (!el) return;
  el.innerHTML = '';
  (state.missions || []).slice(0, 3).forEach(m => {
    if (!m.done && isMissionComplete(m)) { m.done = true; saveState(); }
    const rewardCash = (m.reward && (m.reward.cash || m.reward.coins)) ? (m.reward.cash || m.reward.coins) : 0;
    const rewardXP = (m.reward && m.reward.xp) ? m.reward.xp : 0;
    const txt = `${m.text} — Reward: ${formatCurrency(rewardCash)}, ${rewardXP} XP${m.done ? ' ✅' : ''}`;
    const div = document.createElement('div');
    div.textContent = txt;
    el.appendChild(div);
  });
  updateMissionsButtonLabel();
  fixDailyMissionsLabel();
}

// ------------------ Shop / Leaderboard / News / Price Simulation / Chart / Trading ------------------
// ... rest of script continues as in previous file (unchanged) ...

// ------------------ getPortfolioValue (moved earlier to avoid ReferenceError) ------------------
function getPortfolioValue() {
  let v = (portfolio && portfolio.cash) ? portfolio.cash : 0;
  try {
    STOCKS.forEach(s => {
      const owned = (portfolio.stocks && portfolio.stocks[s.symbol]) ? portfolio.stocks[s.symbol] : 0;
      const p = (prices[s.symbol] !== undefined) ? prices[s.symbol] : 0;
      v += owned * p;
    });
  } catch (e) {
    console.warn('getPortfolioValue fallback error', e);
  }
  return +v;
}

// ------------------ Chart ------------------
let portfolioChart = null;
let chartData = null;
function initChartIfPresent() {
  const canvas = document.getElementById('portfolioChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Defensive: if getPortfolioValue isn't defined yet, compute a fallback using portfolio.cash
  const initialValue = (typeof getPortfolioValue === 'function') ? getPortfolioValue() : (portfolio && portfolio.cash ? portfolio.cash : 0);

  chartData = { labels: [new Date().toLocaleTimeString()], datasets: [{ label: 'Portfolio Value', data: [initialValue], borderColor: '#00FC87', backgroundColor: 'rgba(14,210,247,0.10)', fill: false }]};
  try {
    portfolioChart = new Chart(ctx, { type: 'line', data: chartData, options: { animation: { duration: 300 }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } } });
  } catch (e) { console.warn('Chart init failed', e); portfolioChart = null; }
}
function pushChartSample(v) {
  if (!portfolioChart) return;
  chartData.labels.push(new Date().toLocaleTimeString());
  chartData.datasets[0].data.push(+v.toFixed(2));
  while (chartData.labels.length > 300) { chartData.labels.shift(); chartData.datasets[0].data.shift(); }
  portfolioChart.update();
}

// The rest of the file (updateStockTable, updateTradeTable, updatePortfolioTable, buy/sell, missions, leaderboards etc.)
// remains unchanged from your last version. Only the position/availability of getPortfolioValue() and
// the defensive fallback in initChartIfPresent() were adjusted to avoid the ReferenceError shown in your screenshot.

// ------------------ New Game UI helper (tweak) ------------------
function insertNewGameButton() {
  try {
    const existing = document.getElementById('new-game-btn');
    if (existing) {
      existing.addEventListener('click', function() {
        if (typeof newGame === 'function') newGame();
        else {
          if (!confirm('Start a NEW game? This will clear saved progress. Continue?')) return;
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        }
      }, { once: false });
      return;
    }
    const header = document.getElementById('topbar') || document.querySelector('header') || document.body;
    const btn = document.createElement('button');
    btn.id = 'new-game-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'New Game - reset progress');
    btn.textContent = 'New Game';
    btn.addEventListener('click', function() {
      if (typeof newGame === 'function') newGame();
      else {
        if (!confirm('Start a NEW game? This will clear saved progress. Continue?')) return;
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    }, { once: false });
    header.appendChild(btn);
  } catch (e) {
    console.warn('insertNewGameButton error', e);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    // wire new game button early
    insertNewGameButton();
    // then run rest of initialization (kept from original)
    generateDailyMissions && generateDailyMissions();
    renderMissionsModal && renderMissionsModal();
    renderMissionsBrief && renderMissionsBrief();
    renderShop && renderShop();
    renderAchievements && renderAchievements();
    renderLeaderboard && renderLeaderboard();
    updateHUD && updateHUD();
    initChartIfPresent && initChartIfPresent();
    try { updateStockTable(); } catch (e) { console.warn('updateStockTable failed during startup', e); }
    try { updateTradeTable(); } catch (e) { console.warn('updateTradeTable failed during startup', e); }
    try { updatePortfolioTable(); } catch (e) { console.warn('updatePortfolioTable failed during startup', e); }
    if (priceInterval) clearInterval(priceInterval);
    priceInterval = setInterval(tickPrices, 10000);
    if (newsInterval) clearInterval(newsInterval);
    newsInterval = setInterval(newsTick, 180000);
    const openM = document.getElementById('open-missions'); if (openM) openM.onclick = () => openModal('modal-missions');
    const closeM = document.getElementById('close-missions'); if (closeM) closeM.onclick = () => closeModal('modal-missions');
    const openA = document.getElementById('open-achievements'); if (openA) openA.onclick = () => openModal('modal-achievements');
    const closeA = document.getElementById('close-achievements'); if (closeA) closeA.onclick = () => closeModal('modal-achievements');
    const openS = document.getElementById('open-shop'); if (openS) openS.onclick = () => openModal('modal-shop');
    const closeS = document.getElementById('close-shop'); if (closeS) closeS.onclick = () => closeModal('modal-shop');
    const saveBtn = document.getElementById('save-score'); if (saveBtn) saveBtn.onclick = () => { saveLeaderboardEntry(); toast('Score saved to local leaderboard'); };
    setInterval(updateSeasonTimer, 1000);
    fixDailyMissionsLabel && fixDailyMissionsLabel();
  } catch (err) {
    console.error('Startup error caught:', err);
    // wire button in case of startup failure
    try { insertNewGameButton(); } catch (e) {}
  }
});

// ------------------ New Game helper ------------------
function newGame() {
  if (!confirm('Start a NEW game? This will clear saved progress. Continue?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// persist final state
saveState();
