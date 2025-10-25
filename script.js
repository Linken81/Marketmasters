// script.js - Fully updated version
// Updates:
// 1) Replace all coin rewards with cash rewards added directly to `portfolio.cash`.
// 2) Remove all references to `state.coins`, ensuring missions, achievements, and other features use `portfolio.cash`.


// ------------------ Date / Season helpers ------------------
function getSeasonId() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - onejan) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

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
STOCKS.forEach(s => {
  portfolio.stocks[s.symbol] = 0;
  holdCounters[s.symbol] = 0;
});

let averageBuyPrice = {};
STOCKS.forEach(s => {
  averageBuyPrice[s.symbol] = 0;
});

// ------------------ Prices ------------------
let prices = {};
let prevPrices = {};
function randomPrice() {
  return +(Math.random() * 900 + 100).toFixed(2);
}
function initPricesIfNeeded() {
  STOCKS.forEach(s => {
    if (prices[s.symbol] === undefined) prices[s.symbol] = randomPrice();
  });
}
initPricesIfNeeded();

// ------------------ Persistence & Game State ------------------
const STORAGE_KEY = "marketmasters_full_v1";
let state = {
  xp: 0,
  level: 1,
  achievements: {}, // boolean flags only
  missions: [],
  missionsDate: null,
  shopOwned: {},
  prestige: { count: 0, legacyPoints: 0 },
  seasonId: getSeasonId(),
  leaderboard: JSON.parse(localStorage.getItem("leaderboard_scores") || "[]"),
  activeBoosts: {},
  tickDeltas: []
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) {
    console.warn("loadState", e);
  }
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("saveState", e);
  }
}
loadState();

// ------------------ Missions ------------------
// Replace "coins" with cash rewards added directly to `portfolio.cash`
const MISSION_CANDIDATES = [
  { id: "buy_3", text: "Buy 3 different stocks", check: p => p.buyDifferent >= 3, reward: { cash: 60, xp: 20 } },
  { id: "profit_500", text: "Make $500 profit (tick)", check: p => false, reward: { cash: 120, xp: 40 } },
  { id: "hold_10", text: "Hold a stock for 10 ticks", check: p => false, reward: { cash: 80, xp: 30 } },
  { id: "trade_10", text: "Execute 10 trades", check: p => p.trades >= 10, reward: { cash: 70, xp: 25 } },
  { id: "buy_food", text: "Buy a Food stock", check: p => p.typesBought && p.typesBought.includes("Food"), reward: { cash: 40, xp: 12 } }
];

function renderMissionsModal() {
  const modalList = document.getElementById("missions-list");
  if (!modalList) return;
  modalList.innerHTML = "";
  (state.missions || []).forEach((m, idx) => {
    if (!m.done && isMissionComplete(m)) {
      m.done = true;
      saveState();
    }
    const rewardCash = m.reward && m.reward.cash ? m.reward.cash : 0;
    const rewardXP = m.reward && m.reward.xp ? m.reward.xp : 0;
    const rewardText = `Reward: $${rewardCash}, ${rewardXP} XP`;
    const div = document.createElement("div");
    div.className = "mission";
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${m.text}</strong>
      <div style="font-size:0.9em;color:#9aa7b2">${m.desc || ""}</div>
      <div style="font-size:0.85em;color:#7ee7bf;margin-top:6px">${rewardText}</div>`;
    const right = document.createElement("div");
    right.style.textAlign = "right";
    right.innerHTML = `<div class="meta" style="margin-bottom:6px">${m.done ? "Completed" : "In progress"}</div>
      ${m.done ? `<button class="action-btn" data-claim="${idx}">Claim</button>` : ""}`;
    div.appendChild(left);
    div.appendChild(right);
    modalList.appendChild(div);
    if (m.done) {
      const btn = div.querySelector("button");
      if (btn) {
        btn.onclick = () => {
          const reward = m.reward || { cash: 50, xp: 15 };
          portfolio.cash += reward.cash || 0; // Add cash reward to portfolio.cash
          addXP(reward.xp || 0);
          toast(`Mission claimed: +$${reward.cash}, +${reward.xp} XP`);
          const newM = generateSingleMission();
          if (newM) state.missions[idx] = newM;
          else state.missions.splice(idx, 1);
          saveState();
          renderMissionsModal();
          renderMissionsBrief();
          updateMissionsButtonLabel();
        };
      }
    }
  });
  updateMissionsButtonLabel();
}

function renderMissionsBrief() {
  const el = document.getElementById("missions-brief");
  if (!el) return;
  el.innerHTML = "";
  (state.missions || []).slice(0, 3).forEach(m => {
    if (!m.done && isMissionComplete(m)) {
      m.done = true;
      saveState();
    }
    const rewardCash = m.reward && m.reward.cash ? m.reward.cash : 0;
    const rewardXP = m.reward && m.reward.xp ? m.reward.xp : 0;
    const txt = `${m.text} — Reward: $${rewardCash}, ${rewardXP} XP${m.done ? " ✅" : ""}`;
    const div = document.createElement("div");
    div.textContent = txt;
    el.appendChild(div);
  });
}
