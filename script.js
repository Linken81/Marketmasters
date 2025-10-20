

// script.js - full updated file
// Changes in this update (minimal):
// 1) Replace UI text "Daily Missions (N active)" -> "Missions (N active)" by scanning text nodes and replacing occurrences.
// 2) Change mission label "Make $500 profit (day)" -> "Make $500 profit (tick)" in the mission definitions.
// No other logic or behavior changed. Backup was created above prior to this change.
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
// NOTE: updated profit text requested -> "Make $500 profit (tick)"
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

// Replace "Daily Missions" occurrences in text nodes with "Missions" to update any static UI labels
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
    const rewardCoins = (m.reward && m.reward.coins) ? m.reward.coins : 0;
    const rewardXP = (m.reward && m.reward.xp) ? m.reward.xp : 0;
    const rewardText = `Reward: $${rewardCoins}, ${rewardXP} XP`;
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
          state.coins += reward.coins || 0;
          addXP(reward.xp || 0);
          toast(`Mission claimed: +${reward.coins} coins, +${reward.xp} XP`);
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
    const rewardCoins = (m.reward && m.reward.coins) ? m.reward.coins : 0;
    const rewardXP = (m.reward && m.reward.xp) ? m.reward.xp : 0;
    const txt = `${m.text} — Reward: $${rewardCoins}, ${rewardXP} XP${m.done ? ' ✅' : ''}`;
    const div = document.createElement('div');
    div.textContent = txt;
    el.appendChild(div);
  });
  updateMissionsButtonLabel();
  fixDailyMissionsLabel();
}

// ------------------ Shop / Leaderboard / News / Price Simulation / Chart / Trading ------------------
const SHOP_ITEMS = [
  { id: 'xp_boost_1', name: 'XP Booster (1h)', desc: '+50% XP for 1 hour', price: 300, effect: { xpMultiplier: 1.5, durationMs: 3600000 } },
  { id: 'auto_rebuy', name: 'Auto Rebuy (permanent)', desc: 'Automatically re-buy small positions', price: 1200, effect: { autoRebuy: true } },
  { id: 'chart_skin_neon', name: 'Chart Skin - Neon', desc: 'Cosmetic chart theme', price: 200, effect: { cosmetic: 'neon' } }
];

function renderShop() {
  const el = document.getElementById('shop-items');
  if (!el) return;
  el.innerHTML = '';
  SHOP_ITEMS.forEach(item => {
    const owned = !!state.shopOwned[item.id];
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<div><strong>${item.name}</strong><div style="font-size:0.9em;color:#9aa7b2">${item.desc}</div></div>
      <div>${owned ? 'Owned' : `<button class="action-btn">Buy $${item.price}</button>`}</div>`;
    el.appendChild(div);
    if (!owned) {
      const btn = div.querySelector('button');
      btn.onclick = () => {
        if (state.coins >= item.price) {
          state.coins -= item.price;
          state.shopOwned[item.id] = true;
          applyShopEffect(item);
          toast(`Purchased ${item.name}`);
          saveState();
          updateHUD();
          renderShop();
        } else toast('Not enough coins');
      };
    }
  });
}
function applyShopEffect(item) {
  if (item.effect.autoRebuy) state.autoRebuy = true;
  if (item.effect.cosmetic) state.cosmetic = item.effect.cosmetic;
  if (item.effect.xpMultiplier) {
    state.activeBoosts.xpMultiplier = item.effect.xpMultiplier;
    setTimeout(() => { delete state.activeBoosts.xpMultiplier; toast('XP booster expired'); saveState(); }, item.effect.durationMs);
  }
  saveState();
}

// ------------------ Leaderboard ------------------
function renderLeaderboard() {
  const ul = document.getElementById('scores');
  if (!ul) return;
  const list = (state.leaderboard || []).filter(s => s.season === state.seasonId).sort((a, b) => b.value - a.value).slice(0, 10);
  ul.innerHTML = '';
  list.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.name}</strong>: <span class="price-up">$${(+item.value).toFixed(2)}</span>`;
    ul.appendChild(li);
  });
}
function saveLeaderboardEntry(name = 'Player') {
  const entry = { name, value: +getPortfolioValue().toFixed(2), ts: new Date().toISOString(), season: state.seasonId };
  state.leaderboard = state.leaderboard || [];
  state.leaderboard.push(entry);
  localStorage.setItem('leaderboard_scores', JSON.stringify(state.leaderboard));
  renderLeaderboard();
}
function updateSeasonTimer() {
  const el = document.getElementById('season-timer');
  if (!el) return;
  const now = new Date();
  const day = now.getDay();
  const daysLeft = (7 - day) % 7;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysLeft + 1);
  const diff = end - now;
  const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  el.textContent = `${hrs}:${mins}:${secs}`;
}

// ------------------ News events ------------------
const NEWS_EVENTS = [
  { type: "stock", symbol: "ZOOMX", text: "Zoomix launches new AI chip — big upside", effect: 0.22, mood: "good" },
  { type: "stock", symbol: "FRUIQ", text: "FruityQ seasonal recall — selloff", effect: -0.11, mood: "bad" },
  { type: "type", target: "Energy", text: "Energy subsidies announced.", effect: 0.08, mood: "good" },
  { type: "market", text: "Market rally: broad gains.", effect: 0.10, mood: "good" },
  { type: "market", text: "Market sell-off: volatility spikes.", effect: -0.14, mood: "bad" }
];

function triggerRandomNews() {
  const news = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
  const el = document.getElementById("news-content");
  if (el) el.textContent = news.text;
  const newsEffectMap = {};
  if (news.type === 'stock') newsEffectMap[news.symbol] = news.effect;
  else if (news.type === 'type') STOCKS.forEach(s => { if (s.type === news.target) newsEffectMap[s.symbol] = news.effect; });
  else if (news.type === 'market') STOCKS.forEach(s => newsEffectMap[s.symbol] = news.effect);
  if (news.mood === 'good') addXP(5 + Math.round(Math.abs(news.effect) * 100));
  if (news.mood === 'bad') addXP(2);
  addEventToList(news.text);
  return newsEffectMap;
}
function addEventToList(text) {
  const ul = document.getElementById('events-list');
  if (!ul) return;
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
  ul.insertBefore(li, ul.firstChild);
  while (ul.children.length > 8) ul.removeChild(ul.lastChild);
}

// ------------------ Price simulation ------------------
function setRandomPrices(newsEffectMap = {}) {
  prevPrices = { ...prices };
  STOCKS.forEach(stock => {
    let old = prices[stock.symbol] || randomPrice();
    let changePercent = (Math.random() * 0.07) - 0.035;
    if (Math.random() < 0.10) changePercent += (Math.random() * 0.06 - 0.03);
    if (newsEffectMap[stock.symbol]) changePercent += newsEffectMap[stock.symbol];
    changePercent = Math.max(-0.5, Math.min(0.5, changePercent));
    prices[stock.symbol] = Math.max(5, +(old * (1 + changePercent)).toFixed(2));
  });
}

// ------------------ Chart ------------------
let portfolioChart = null;
let chartData = null;
function initChartIfPresent() {
  const canvas = document.getElementById('portfolioChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  chartData = { labels: [new Date().toLocaleTimeString()], datasets: [{ label: 'Portfolio Value', data: [getPortfolioValue()], borderColor: '#00FC87', backgroundColor: 'rgba(14,210,247,0.10)', fill: true, tension: 0.28 }] };
  portfolioChart = new Chart(ctx, { type: 'line', data: chartData, options: { animation: { duration: 300 }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } } });
}
function pushChartSample(v) {
  if (!portfolioChart) return;
  chartData.labels.push(new Date().toLocaleTimeString());
  chartData.datasets[0].data.push(+v.toFixed(2));
  while (chartData.labels.length > 300) { chartData.labels.shift(); chartData.datasets[0].data.shift(); }
  portfolioChart.update();
}

// ------------------ Table updates ------------------
function updateStockTable() {
  const tbody = document.getElementById('stock-table'); if (!tbody) return;
  tbody.innerHTML = '';
  STOCKS.forEach(stock => {
    const price = (prices[stock.symbol] !== undefined) ? prices[stock.symbol] : 0;
    const change = +(price - (prevPrices[stock.symbol] || price));
    const changeStr = (change > 0 ? '+' : '') + change.toFixed(2);
    const className = change > 0 ? 'price-up' : change < 0 ? 'price-down' : 'price-same';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${stock.symbol}</td><td>${stock.type}</td><td>$${price.toFixed(2)}</td><td class="${className}">${changeStr}</td><td></td>`;
    tbody.appendChild(tr);
  });
}
function updateTradeTable() {
  const tbody = document.getElementById('trade-table'); if (!tbody) return;
  tbody.innerHTML = '';
  STOCKS.forEach(stock => {
    const price = (prices[stock.symbol] !== undefined) ? prices[stock.symbol] : 0;
    const change = +(price - (prevPrices[stock.symbol] || price));
    const changeStr = (change > 0 ? '+' : '') + change.toFixed(2);
    const className = change > 0 ? 'price-up' : change < 0 ? 'price-down' : 'price-same';
    const rowId = `buy_${stock.symbol}`, costId = `buy_cost_${stock.symbol}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${stock.symbol}</td><td>${stock.type}</td><td>$${price.toFixed(2)}</td><td class="${className}">${changeStr}</td>
      <td>
        <input type="number" min="1" value="1" class="buy-input" id="${rowId}">
        <button onclick="buyStock('${stock.symbol}')" class="action-btn">Buy</button>
        <span class="buy-cost" id="${costId}">$${price.toFixed(2)}</span>
      </td>`;
    tbody.appendChild(tr);
    setTimeout(() => {
      const qtyInput = document.getElementById(rowId), costSpan = document.getElementById(costId);
      if (qtyInput && costSpan) {
        function updateCost() { let q = parseInt(qtyInput.value) || 0; costSpan.textContent = `$${(q * price).toFixed(2)}`; }
        qtyInput.addEventListener('input', updateCost);
        updateCost();
      }
    }, 0);
  });
}
function updatePortfolioTable() {
  const tbody = document.getElementById('portfolio-table'); if (!tbody) return;
  tbody.innerHTML = '';
  STOCKS.forEach(stock => {
    const owned = portfolio.stocks[stock.symbol] || 0;
    if (owned > 0) {
      const price = (prices[stock.symbol] !== undefined) ? prices[stock.symbol] : 0;
      const total = owned * price;
      const profitLoss = (price - averageBuyPrice[stock.symbol]) * owned;
      const changeStr = (profitLoss > 0 ? '+' : '') + profitLoss.toFixed(2);
      const className = profitLoss > 0 ? 'price-up' : profitLoss < 0 ? 'price-down' : 'price-same';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${stock.symbol}</td><td>${owned}</td><td>$${price.toFixed(2)}</td><td>$${total.toFixed(2)}</td>
        <td class="${className}">${changeStr}</td>
        <td style="white-space:nowrap;min-width:200px;">
          <input type="number" min="1" value="1" id="sell_${stock.symbol}" style="width:40px;">
          <button class="sell-btn action-btn" onclick="sellStock('${stock.symbol}')">Sell</button>
          <button class="sell-all-btn action-btn" onclick="sellAllStock('${stock.symbol}')">Sell All</button>
        </td>`;
      tbody.appendChild(tr);
    }
  });
}

// ------------------ Trading (buy/sell) ------------------
window.buyStock = function (symbol) {
  const input = document.getElementById(`buy_${symbol}`);
  let qty = input ? parseInt(input.value, 10) : 1;
  qty = Math.max(1, qty || 1);
  const cost = (prices[symbol] || 0) * qty;
  if (cost <= portfolio.cash) {
    const prevQty = portfolio.stocks[symbol] || 0;
    const totalQty = prevQty + qty;
    averageBuyPrice[symbol] = (averageBuyPrice[symbol] * prevQty + (prices[symbol] || 0) * qty) / Math.max(1, totalQty);
    portfolio.cash -= cost;
    updateCash();
    portfolio.stocks[symbol] = totalQty;
    dayProgress.trades = (dayProgress.trades || 0) + 1;
    if (!dayProgress.typesBought) dayProgress.typesBought = [];
    const type = (STOCKS.find(s => s.symbol === symbol) || {}).type;
    if (type && !dayProgress.typesBought.includes(type)) dayProgress.typesBought.push(type);
    addXP(Math.max(1, Math.round(cost / 200)));
    state.coins += Math.max(0, Math.round(cost / 1000));
    recordOrder('buy', symbol, qty, prices[symbol]);
    if (!state.achievements || !state.achievements['first_trade']) unlockAchievement('first_trade');
    toast(`Bought ${qty} ${symbol} for ${formatCurrency(cost)}`);
    saveState();
    updateHUD();
    updatePortfolioTable();
    updateTradeTable();
    updateStockTable();
    renderWatchlist();
  } else toast('Not enough cash');
};

window.sellStock = function (symbol) {
  const input = document.getElementById(`sell_${symbol}`);
  let qty = input ? parseInt(input.value, 10) : 1;
  qty = Math.max(1, qty || 1);
  const owned = portfolio.stocks[symbol] || 0;
  if (qty > owned) { toast('Not enough shares'); return; }
  const revenue = (prices[symbol] || 0) * qty;
  portfolio.cash += revenue;
  updateCash();
  portfolio.stocks[symbol] = owned - qty;
  if (portfolio.stocks[symbol] === 0) averageBuyPrice[symbol] = 0;
  const profit = (prices[symbol] - averageBuyPrice[symbol]) * qty;
  if (profit > 0) {
    addXP(Math.round(profit / 10));
    state.coins += Math.round(profit / 50);
    dayProgress.dayProfit = (dayProgress.dayProfit || 0) + profit;
  }
  recordOrder('sell', symbol, qty, prices[symbol]);
  if (!state.achievements || !state.achievements['first_trade']) unlockAchievement('first_trade');
  toast(`Sold ${qty} ${symbol} for ${formatCurrency(revenue)}`);
  saveState();
  updateHUD();
  updatePortfolioTable();
  updateTradeTable();
  updateStockTable();
};

window.sellAllStock = function (symbol) {
  const owned = portfolio.stocks[symbol] || 0;
  if (owned > 0) {
    const el = document.getElementById(`sell_${symbol}`);
    if (el) el.value = owned;
    sellStock(symbol);
  }
};

// ------------------ Order recording & Watchlist ------------------
function recordOrder(type, symbol, qty, price) {
  orderHistory.unshift({ type, symbol, qty, price, ts: new Date().toISOString() });
  if (orderHistory.length > 200) orderHistory.pop();
}
function renderWatchlist() {
  const wrap = document.getElementById('watchlist');
  if (!wrap) return;
  wrap.innerHTML = '';
  watchlist.forEach(sym => {
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.alignItems = 'center'; div.style.marginBottom = '6px';
    const price = prices[sym] ? `$${prices[sym].toFixed(2)}` : '—';
    div.innerHTML = `<div style="font-weight:700">${sym}</div><div style="color:#9aa7b2">${price} <button class="action-btn" data-remove="${sym}" style="margin-left:8px;">Remove</button></div>`;
    wrap.appendChild(div);
    const btn = div.querySelector('button');
    btn.onclick = () => { watchlist = watchlist.filter(s => s !== sym); renderWatchlist(); };
  });
}

// ------------------ TICKS: update holdCounters & tick deltas ------------------
function tickPrices() {
  setRandomPrices({});
  STOCKS.forEach(s => {
    const owned = (portfolio.stocks[s.symbol] || 0);
    if (owned > 0) { holdCounters[s.symbol] = (holdCounters[s.symbol] || 0) + 1; }
    else { holdCounters[s.symbol] = 0; }
  });
  let tickDelta = 0;
  STOCKS.forEach(s => {
    const owned = portfolio.stocks[s.symbol] || 0;
    const before = prevPrices[s.symbol] !== undefined ? prevPrices[s.symbol] : prices[s.symbol];
    const after = prices[s.symbol] !== undefined ? prices[s.symbol] : before;
    tickDelta += owned * (after - before);
  });
  state.tickDeltas = state.tickDeltas || [];
  state.tickDeltas.push({ ts: new Date().toISOString(), delta: +tickDelta.toFixed(2) });
  if (state.tickDeltas.length > 500) state.tickDeltas.shift();
  updateTradeTable();
  updateStockTable();
  updatePortfolioTable();
  pushChartSample(getPortfolioValue());
  let totalHoldTicks = 0;
  STOCKS.forEach(s => { if (portfolio.stocks[s.symbol] > 0) totalHoldTicks += 1; });
  dayProgress.holdTicks = (dayProgress.holdTicks || 0) + totalHoldTicks;
  checkMissions();
  updateHUD();
}

function newsTick() {
  const newsMap = triggerRandomNews();
  setRandomPrices(newsMap);
  updateTradeTable();
  updateStockTable();
  updatePortfolioTable();
  pushChartSample(getPortfolioValue());
  renderLeaderboard();
  saveState();
}

// ------------------ MISSIONS check (baseline-relative) ------------------
function checkMissions() {
  dayProgress.buyDifferent = Object.values(portfolio.stocks).filter(v => v > 0).length;
  dayProgress.trades = dayProgress.trades || 0;
  dayProgress.typesBought = dayProgress.typesBought || [];
  let changed = false;
  (state.missions || []).forEach(m => {
    if (m.done) return;
    try { if (isMissionComplete(m)) { m.done = true; changed = true; } } catch (e) { console.warn('mission check error', e); }
  });
  if (changed) { saveState(); renderMissionsModal(); renderMissionsBrief(); }
}

function getPortfolioValue() {
  let v = portfolio.cash || 0;
  STOCKS.forEach(s => { const owned = portfolio.stocks[s.symbol] || 0; const p = (prices[s.symbol] !== undefined) ? prices[s.symbol] : 0; v += owned * p; });
  return +v;
}

// ------------------ Startup & wiring (defensive) ------------------
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'add-watch') {
    const inp = document.getElementById('watch-input');
    const sym = (inp && inp.value || '').trim().toUpperCase();
    if (sym && STOCKS.find(s => s.symbol === sym) && !watchlist.includes(sym)) { watchlist.push(sym); renderWatchlist(); inp.value = ''; toast(`${sym} added to watchlist`); }
    else toast('Invalid symbol or already watched');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  try {
    generateDailyMissions();
    renderMissionsModal();
    renderMissionsBrief();
    renderShop();
    renderAchievements();
    renderLeaderboard();
    updateHUD();
    initChartIfPresent();
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
    const addWatchBtn = document.getElementById('add-watch'); if (addWatchBtn) addWatchBtn.onclick = () => { const inp = document.getElementById('watch-input'); const sym = (inp && inp.value || '').trim().toUpperCase(); if (sym && STOCKS.find(s => s.symbol === sym) && !watchlist.includes(sym)) { watchlist.push(sym); renderWatchlist(); inp.value = ''; toast(`${sym} added to watchlist`); } else toast('Invalid symbol or already watched'); };
    setInterval(updateSeasonTimer, 1000);
    // run UI text fix (replaces any "Daily Missions" strings in text nodes)
    fixDailyMissionsLabel();
  } catch (startupErr) {
    console.error('Startup error caught:', startupErr);
    try {
      if (typeof updateStockTable === 'function') updateStockTable();
      if (typeof updateTradeTable === 'function') updateTradeTable();
      if (typeof updatePortfolioTable === 'function') updatePortfolioTable();
      if (typeof updateHUD === 'function') updateHUD();
      if (typeof renderMissionsModal === 'function') renderMissionsModal();
      if (typeof renderAchievements === 'function') renderAchievements();
      if (typeof renderShop === 'function') renderShop();
      if (typeof renderLeaderboard === 'function') renderLeaderboard();
      if (!priceInterval) priceInterval = setInterval(tickPrices, 10000);
      if (!newsInterval) newsInterval = setInterval(newsTick, 180000);
      fixDailyMissionsLabel();
    } catch (e) { console.error('Error during recovery UI population:', e); }
  }
});

// ------------------ Modals ------------------
function openModal(id) { const m = document.getElementById(id); if (m) m.setAttribute('aria-hidden', 'false'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.setAttribute('aria-hidden', 'true'); }

// persist final state
saveState();
