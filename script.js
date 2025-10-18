// Fully updated script.js (XP bar now shows current XP and XP-to-next)
// - Minimal focused change: updateHUD now shows "current / required XP" and remaining-to-next as tooltip/ARIA.
// - Retains all previous behavior: missions, achievements, first-trade, chart, ticks, news, watchlist, shop, etc.

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
function randomPrice(){ return +(Math.random()*900 + 100).toFixed(2); }
function initPricesIfNeeded(){ STOCKS.forEach(s => { if (prices[s.symbol] === undefined) prices[s.symbol] = randomPrice(); }); }
initPricesIfNeeded();

// ------------------ Persistence & Game State ------------------
const STORAGE_KEY = "marketmasters_full_v1";
let state = {
  xp: 0,
  level: 1,
  coins: 0,
  achievements: {},
  missions: [],
  missionsDate: null,
  shopOwned: {},
  prestige: { count: 0, legacyPoints: 0 },
  seasonId: getSeasonId(),
  leaderboard: JSON.parse(localStorage.getItem('leaderboard_scores') || "[]"),
  activeBoosts: {}
};

function loadState(){ try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) Object.assign(state, JSON.parse(raw)); }catch(e){ console.warn('loadState', e); } }
function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn('saveState', e); } }
loadState();

// Per earlier request: reset level/XP and clear achievements/shop on refresh
state.level = 1;
state.xp = 0;
state.achievements = {};
state.shopOwned = {};
saveState();

// ------------------ UI Helpers ------------------
function toast(text, timeout=3000){
  const toasts = document.getElementById('toasts');
  if(!toasts) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  toasts.appendChild(el);
  setTimeout(()=> el.remove(), timeout);
}
function formatCurrency(v){ return `$${(+v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }

function updateCash(){
  const el = document.getElementById('cash');
  if(!el) return;
  el.textContent = formatCurrency(portfolio.cash || 0);
}

// ------------------ Confetti ------------------
function launchConfetti(amount = 40){
  const colors = ['#FF3CAC','#784BA0','#21e6c1','#00fc87','#FFD166','#FF6B6B'];
  for(let i=0;i<amount;i++){
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random()*100 + 'vw';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    const size = 6 + Math.random()*12;
    el.style.width = size + 'px';
    el.style.height = Math.round(size*1.35) + 'px';
    const duration = 2000 + Math.random()*2500;
    el.style.animationDuration = `${duration}ms, ${800+Math.random()*1500}ms, ${duration}ms`;
    document.body.appendChild(el);
    el.addEventListener('animationend', ()=> el.remove());
  }
}

// ------------------ XP / Leveling ------------------
function xpForLevel(l){ return Math.floor(100 * Math.pow(l,1.35)); }
function addXP(amount){
  if(amount<=0) return;
  if(state.activeBoosts.xpMultiplier) amount = Math.round(amount * state.activeBoosts.xpMultiplier);
  state.xp += Math.floor(amount);
  checkLevelUp();
  saveState();
  updateHUD();
}
function checkLevelUp(){
  let gained=false;
  while(state.xp >= xpForLevel(state.level)){
    state.xp -= xpForLevel(state.level);
    state.level++;
    gained=true;
    const rewardCoins = 50 + state.level*5;
    state.coins += rewardCoins;
    toast(`Level up! Now level ${state.level}. +${rewardCoins} coins`);
    launchConfetti(60);
    unlockAchievement('level_up');
  }
  if(gained) saveState();
}

// UPDATE: now shows numeric XP and how much to next level
function updateHUD(){
  const elXp = document.getElementById('xp');
  const elLevel = document.getElementById('level');
  if(elLevel) elLevel.textContent = state.level;

  const required = xpForLevel(state.level);
  const current = state.xp;
  const remaining = Math.max(0, required - current);

  if(elXp){
    // display "current / required XP"
    elXp.textContent = `${current} / ${required} XP`;
    // helpful tooltip with remaining
    elXp.title = `${current} XP — ${remaining} XP to next level`;
  }

  const bar = document.getElementById('xp-bar');
  if(bar){
    const pct = Math.min(100, Math.round((current / required) * 100));
    bar.style.width = pct + '%';
    // ARIA attributes for screen readers
    bar.setAttribute('role','progressbar');
    bar.setAttribute('aria-valuenow', String(current));
    bar.setAttribute('aria-valuemin','0');
    bar.setAttribute('aria-valuemax', String(required));
    bar.setAttribute('aria-label', `${current} of ${required} XP, ${remaining} to next level`);
  }

  // optional element that shows remaining explicitely if present
  const xpRemEl = document.getElementById('xp-remaining');
  if(xpRemEl){
    xpRemEl.textContent = `${remaining} XP to next level`;
  }

  renderNextAchievement();
}

// ------------------ Achievements ------------------
const ACHIEVEMENT_LIST = [
  { id:'first_trade', name:'First Trade', desc:'Make your first trade', coins:50 },
  { id:'profit_1000', name:'Profit $1,000', desc:'Accumulate $1,000 profit total', coins:150 },
  { id:'hold_50ticks', name:'Patient Investor', desc:'Hold a stock for 50 ticks', coins:200 },
  { id:'level_10', name:'Rising Star', desc:'Reach level 10', coins:300 }
];
function unlockAchievement(id){
  if(state.achievements[id]) return;
  const spec = ACHIEVEMENT_LIST.find(a=>a.id===id);
  state.achievements[id] = true;
  if(spec){
    state.coins += spec.coins;
    toast(`Achievement unlocked: ${spec.name} (+${spec.coins} coins)`);
    launchConfetti(80);
  } else {
    toast(`Achievement unlocked: ${id}`);
    launchConfetti(40);
  }
  saveState(); renderAchievements(); updateHUD();
}
function renderAchievements(){
  const el = document.getElementById('achievements-list');
  if(!el) return;
  el.innerHTML = '';
  ACHIEVEMENT_LIST.forEach(a=>{
    const unlocked = !!state.achievements[a.id];
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<div><strong>${a.name}</strong><div style="font-size:0.9em;color:#9aa7b2">${a.desc}</div></div>
        <div style="font-weight:700; color:${unlocked ? '#00fc87' : '#9aa7b2'}">${unlocked ? 'Unlocked' : 'Locked'}</div>`;
    el.appendChild(div);
  });
}
function renderNextAchievement(){
  const el = document.getElementById('next-achievement');
  if(!el) return;
  const next = ACHIEVEMENT_LIST.find(a => !state.achievements[a.id]);
  el.textContent = next ? `Next achievement: ${next.name} — ${next.desc}` : 'All achievements unlocked!';
}

// ------------------ Missions (unchanged from working version) ------------------
const MISSION_CANDIDATES = [
  { id:'buy_3', text:'Buy 3 different stocks', check: (p)=> p.buyDifferent >=3, reward:{coins:60,xp:20} },
  { id:'profit_500', text:'Make $500 profit (day)', check: (p)=> p.dayProfit>=500, reward:{coins:120,xp:40} },
  { id:'hold_10', text:'Hold a stock for 10 ticks', check: (p)=> false, reward:{coins:80,xp:30} }, // handled with holdCounters
  { id:'trade_10', text:'Execute 10 trades', check: (p)=> p.trades>=10, reward:{coins:70,xp:25} },
  { id:'buy_food', text:'Buy a Food stock', check: (p)=> p.typesBought && p.typesBought.includes('Food'), reward:{coins:40,xp:12} }
];

function generateDailyMissions(){
  const today = getTodayStr();
  if(state.missionsDate === today && state.missions && state.missions.length===3) return;
  const shuffled = MISSION_CANDIDATES.sort(()=> Math.random()-0.5).slice(0,3);
  state.missions = shuffled.map(m => ({...m, done:false}));
  state.missionsDate = today;
  saveState();
}
function generateSingleMission(){
  const activeIds = new Set((state.missions||[]).map(m=>m.id));
  const pool = MISSION_CANDIDATES.filter(c=>!activeIds.has(c.id));
  if(pool.length===0) return null;
  return {...pool[Math.floor(Math.random()*pool.length)], done:false};
}
function renderMissionsModal(){
  const modalList = document.getElementById('missions-list');
  if(!modalList) return;
  modalList.innerHTML = '';
  (state.missions||[]).forEach((m, idx)=>{
    const rewardCoins = (m.reward && m.reward.coins) ? m.reward.coins : 0;
    const rewardXP = (m.reward && m.reward.xp) ? m.reward.xp : 0;
    const rewardText = `Reward: ${rewardCoins}c, ${rewardXP} XP`;

    const div = document.createElement('div');
    div.className = 'mission';
    div.style.display='flex';
    div.style.justifyContent='space-between';
    div.style.alignItems='center';

    const left = document.createElement('div');
    left.innerHTML = `<strong>${m.text}</strong>
      <div style="font-size:0.9em;color:#9aa7b2">${m.desc || ''}</div>
      <div style="font-size:0.85em;color:#7ee7bf;margin-top:6px">${rewardText}</div>`;

    const right = document.createElement('div');
    right.style.textAlign='right';
    right.innerHTML = `<div class="meta" style="margin-bottom:6px">${m.done ? 'Completed' : 'In progress'}</div>
      ${m.done ? `<button class="action-btn" data-claim="${idx}">Claim (${rewardCoins}c, ${rewardXP}XP)</button>` : ''}`;

    div.appendChild(left);
    div.appendChild(right);
    modalList.appendChild(div);

    if(m.done){
      const btn = div.querySelector('button');
      if(btn){
        btn.onclick = ()=> {
          const reward = m.reward || {coins:50, xp:15};
          state.coins += reward.coins || 0;
          addXP(reward.xp || 0);
          toast(`Mission claimed: +${reward.coins} coins, +${reward.xp} XP`);
          const newM = generateSingleMission();
          if(newM) state.missions[idx] = newM;
          else state.missions.splice(idx,1);
          saveState();
          renderMissionsModal();
          renderMissionsBrief();
        };
      }
    }
  });
}
function renderMissionsBrief(){
  const el = document.getElementById('missions-brief');
  if(!el) return;
  el.innerHTML = '';
  (state.missions||[]).slice(0,3).forEach(m=>{
    const rewardCoins = (m.reward && m.reward.coins) ? m.reward.coins : 0;
    const rewardXP = (m.reward && m.reward.xp) ? m.reward.xp : 0;
    const txt = `${m.text} — Reward: ${rewardCoins}c, ${rewardXP} XP${m.done ? ' ✅' : ''}`;
    const div = document.createElement('div'); div.textContent = txt; el.appendChild(div);
  });
}

// ------------------ Shop / Leaderboard / News / Price simulation / Chart / Trading / Missions checking / etc. ------------------
// (kept unchanged from working version; omitted below for brevity in this message)
// In your local script.js these sections are present exactly as they were — they were not modified except where noted above.

function setRandomPrices(newsEffectMap = {}){ prevPrices = {...prices}; STOCKS.forEach(stock=>{ let oldPrice = prices[stock.symbol] || randomPrice(); let changePercent = (Math.random()*0.07)-0.035; if(Math.random()<0.10) changePercent += (Math.random()*0.06 - 0.03); if(newsEffectMap[stock.symbol]) changePercent += newsEffectMap[stock.symbol]; changePercent = Math.max(-0.5, Math.min(0.5, changePercent)); prices[stock.symbol] = Math.max(5, +(oldPrice * (1 + changePercent)).toFixed(2)); }); }
function getPortfolioValue(){ let v = portfolio.cash || 0; STOCKS.forEach(s => { const owned = portfolio.stocks[s.symbol] || 0; const p = (prices[s.symbol] !== undefined) ? prices[s.symbol] : 0; v += owned * p; }); return +v; }

// If you'd like, I can paste the full (entire) script.js file with the unchanged sections included so you can replace your file in one copy/paste. I kept everything minimal here: the only functional change is updateHUD displaying numeric XP and "XP to next level" information.
