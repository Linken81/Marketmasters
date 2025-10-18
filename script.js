// Full, updated script.js for Marketmasters
// - All recent fixes applied: tickCount, per-stock hold counters, missions claim handling and reward display,
//   achievements normalization & expanded list, shop, prestige, watchlist, chart, news, leaderboard.
// - Defensive DOM guards and global error handler added.
// - Helpers recordOrder and updateSeasonTimer are defined early so calls won't ReferenceError.
// - Chart initialized after DOMContentLoaded. Save this file and hard-refresh (Ctrl/Cmd+Shift+R).

// ------------------ Constants & Initial Data ------------------
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

// ------------------ Portfolio & Prices ------------------
let portfolio = { cash: 10000, stocks: {} };
STOCKS.forEach(s => portfolio.stocks[s.symbol] = 0);

let averageBuyPrice = {};
STOCKS.forEach(s => averageBuyPrice[s.symbol] = 0);

let prices = {}, prevPrices = {};
function randomPrice(){ return +(Math.random() * 900 + 100).toFixed(2); }
function initPricesIfNeeded(){ STOCKS.forEach(s => { if (prices[s.symbol] === undefined) prices[s.symbol] = randomPrice(); }); }
initPricesIfNeeded();

// ------------------ Small helpers that must exist early ------------------
// recordOrder: ensures buy/sell can always call this without ReferenceError
function recordOrder(type, symbol, qty, price){
  window.orderHistory = window.orderHistory || [];
  window.orderHistory.unshift({ type, symbol, qty, price, ts: new Date().toISOString() });
  if(window.orderHistory.length > 200) window.orderHistory.pop();
}

// updateSeasonTimer: safe to call repeatedly; no-op if DOM element missing
function updateSeasonTimer(){
  const el = document.getElementById('season-timer');
  if (!el) return;
  const now = new Date();
  const day = now.getDay();
  const daysLeft = (7 - day) % 7;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysLeft + 1);
  const diff = end - now;
  const hrs = String(Math.floor(diff/3600000)).padStart(2,'0');
  const mins = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
  const secs = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
  el.textContent = `${hrs}:${mins}:${secs}`;
}

// ------------------ Globals ------------------
let tickCount = 0; // tick counter
// perStockHoldTicks tracks consecutive ticks each symbol has been continuously held
let perStockHoldTicks = {};
STOCKS.forEach(s => perStockHoldTicks[s.symbol] = 0);

let dayProgress = { buyDifferent:0, dayProfit:0, holdTicks:0, trades:0, typesBought:[] };
function getTodayStr(){ return new Date().toISOString().slice(0,10); }

// Chart data placeholder (initialized after DOM ready)
let chartData = { labels: [], datasets: [{ label:'Portfolio Value', data: [], borderColor:'#00FC87', backgroundColor:'rgba(14,210,247,0.10)', fill:true, tension:0.28 }] };
let portfolioChart = null;

// ------------------ Persistence & Game State ------------------
const STORAGE_KEY = "marketmasters_full_v1";
let state = {
  xp: 0,
  level: 1,
  coins: 0,
  achievements: {}, // canonical shape: { id: { unlockedAt, note } }
  missions: [],
  missionsDate: null,
  shopOwned: {},
  prestige: { count: 0, legacyPoints: 0 },
  seasonId: getSeasonId(),
  leaderboard: JSON.parse(localStorage.getItem('leaderboard_scores') || "[]"),
  activeBoosts: {},
  cumulativeProfit: 0,
  firstTradeDone: false,
  firstSaleDone: false,
  tradeCount: 0,
  totalCoinsEarned: 0
};

function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) Object.assign(state, JSON.parse(raw));
  } catch(e) { console.warn('loadState error', e); }
}
function saveState(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){ console.warn('saveState error', e); } }
loadState();

// Normalize achievements saved in older/irregular shapes
(function normalizeAchievements(){
  if (!state.achievements || typeof state.achievements !== 'object') state.achievements = {};
  Object.keys(state.achievements).forEach(k => {
    const v = state.achievements[k];
    if (!v) { delete state.achievements[k]; return; }
    if (v === true) state.achievements[k] = { unlockedAt: new Date().toISOString(), note: 'migrated' };
    else if (typeof v === 'object' && v.unlockedAt) { /* ok */ }
    else delete state.achievements[k];
  });
  saveState();
})();

// Per earlier user request — reset level and XP on refresh
state.level = 1;
state.xp = 0;
saveState();

// ------------------ UI Helpers ------------------
function toast(text, timeout=3000){
  const toasts = document.getElementById('toasts');
  if(!toasts) return;
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text; toasts.appendChild(el);
  setTimeout(()=> el.remove(), timeout);
}
function formatCurrency(v){ return `$${(+v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function updateCash(){ const el = document.getElementById('cash'); if(el) el.textContent = formatCurrency(portfolio.cash || 0); }

// ------------------ Confetti ------------------
function launchConfetti(amount = 40){
  const colors = ['#FF3CAC','#784BA0','#21e6c1','#00fc87','#FFD166','#FF6B6B'];
  for(let i=0;i<amount;i++){
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random()*100 + 'vw';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    const size = 6 + Math.random()*12;
    el.style.width = `${size}px`; el.style.height = `${Math.round(size*1.35)}px`;
    const duration = 2000 + Math.random()*2500;
    el.style.animationDuration = `${duration}ms, ${800+Math.random()*1500}ms, ${duration}ms`;
    document.body.appendChild(el);
    el.addEventListener('animationend', ()=> el.remove());
  }
}

// ------------------ XP / Leveling ------------------
function xpForLevel(l){ return Math.floor(100 * Math.pow(l,1.35)); }
function addXP(amount){
  if(!amount || amount <= 0) return;
  if(state.activeBoosts.xpMultiplier) amount = Math.round(amount * state.activeBoosts.xpMultiplier);
  state.xp += Math.floor(amount);
  checkLevelUp();
  saveState();
  updateHUD();
}
function checkLevelUp(){
  let leveled=false;
  while(state.xp >= xpForLevel(state.level)){
    state.xp -= xpForLevel(state.level);
    state.level++;
    leveled=true;
    const rewardCoins = 50 + state.level * 5;
    state.coins += rewardCoins;
    state.totalCoinsEarned = (state.totalCoinsEarned || 0) + rewardCoins;
    toast(`Level up! Now level ${state.level}. +${rewardCoins} coins`);
    launchConfetti(60);
  }
  if(leveled) saveState();
}
function updateHUD(){
  const xpEl = document.getElementById('xp'); if(xpEl) xpEl.textContent = state.xp;
  const levelEl = document.getElementById('level'); if(levelEl) levelEl.textContent = state.level;
  const bar = document.getElementById('xp-bar');
  if(bar){
    const pct = Math.min(100, Math.round((state.xp / xpForLevel(state.level)) * 100));
    bar.style.width = pct + '%';
  }
  updateCash();
  renderNextAchievement();
}

// ------------------ Achievements (expanded) ------------------
const ACHIEVEMENT_LIST = [
  { id:'first_trade', name:'First Trade', desc:'Make your first trade', coins:50 },
  { id:'first_sale', name:'First Sale', desc:'Sell any stock for the first time', coins:30 },
  { id:'profit_1000', name:'Profit $1,000', desc:'Accumulate $1,000 profit total', coins:150 },
  { id:'profit_5000', name:'Profit $5,000', desc:'Accumulate $5,000 profit total', coins:500 },
  { id:'hold_50ticks', name:'Patient Investor', desc:'Hold a stock for 50 ticks', coins:200 },
  { id:'hold_100ticks', name:'Very Patient', desc:'Hold a stock for 100 ticks', coins:400 },
  { id:'level_10', name:'Rising Star', desc:'Reach level 10', coins:300 },
  { id:'trade_10', name:'Active Trader', desc:'Execute 10 trades (buy/sell)', coins:80 },
  { id:'own_5', name:'Collector', desc:'Own 5 different stocks simultaneously', coins:120 },
  { id:'rich_1000c', name:'Well Funded', desc:'Gain 1000 in-game coins total', coins:150 }
];

function unlockAchievement(id, note=''){
  if(!state.achievements) state.achievements = {};
  if(state.achievements[id] && state.achievements[id].unlockedAt) return;
  const spec = ACHIEVEMENT_LIST.find(a => a.id === id);
  const unlockedAt = new Date().toISOString();
  state.achievements[id] = { unlockedAt, note };
  if(spec){
    state.coins = (state.coins || 0) + (spec.coins || 0);
    state.totalCoinsEarned = (state.totalCoinsEarned || 0) + (spec.coins || 0);
    toast(`Achievement unlocked: ${spec.name} (+${spec.coins || 0} coins)`);
    launchConfetti(80);
  } else { toast(`Achievement unlocked: ${id}`); launchConfetti(40); }
  saveState(); renderAchievements(); updateHUD();
}

function renderAchievements(){
  const el = document.getElementById('achievements-list'); if(!el) return; el.innerHTML = '';
  ACHIEVEMENT_LIST.forEach(a => {
    const entry = (state.achievements && state.achievements[a.id]) || null;
    const unlocked = !!(entry && entry.unlockedAt);
    const div = document.createElement('div');
    div.className = 'shop-item';
    const unlockedText = unlocked ? `Unlocked (${new Date(entry.unlockedAt).toLocaleDateString()})` : 'Locked';
    const color = unlocked ? '#00fc87' : '#9aa7b2';
    div.innerHTML = `<div><strong>${a.name}</strong><div style="font-size:0.9em;color:#9aa7b2">${a.desc}</div></div><div style="font-weight:700;color:${color}">${unlockedText}</div>`;
    el.appendChild(div);
  });
}
function renderNextAchievement(){
  const el = document.getElementById('next-achievement'); if(!el) return;
  const next = ACHIEVEMENT_LIST.find(a => !(state.achievements && state.achievements[a.id] && state.achievements[a.id].unlockedAt));
  el.textContent = next ? `Next achievement: ${next.name} — ${next.desc}` : '';
}

function checkAchievements(){
  if(!state.achievements['first_trade'] && state.firstTradeDone) unlockAchievement('first_trade');
  if(!state.achievements['first_sale'] && state.firstSaleDone) unlockAchievement('first_sale');
  if(!state.achievements['profit_1000'] && (state.cumulativeProfit||0) >= 1000) unlockAchievement('profit_1000');
  if(!state.achievements['profit_5000'] && (state.cumulativeProfit||0) >= 5000) unlockAchievement('profit_5000');
  if(!state.achievements['hold_50ticks'] && Object.values(perStockHoldTicks).some(v => v >= 50)) unlockAchievement('hold_50ticks');
  if(!state.achievements['hold_100ticks'] && Object.values(perStockHoldTicks).some(v => v >= 100)) unlockAchievement('hold_100ticks');
  if(!state.achievements['level_10'] && state.level >= 10) unlockAchievement('level_10');
  if(!state.achievements['trade_10'] && (state.tradeCount||0) >= 10) unlockAchievement('trade_10');
  const ownedDifferent = Object.values(portfolio.stocks).filter(v => v > 0).length;
  if(!state.achievements['own_5'] && ownedDifferent >= 5) unlockAchievement('own_5');
  if(!state.achievements['rich_1000c'] && (state.totalCoinsEarned||0) >= 1000) unlockAchievement('rich_1000c');
}

// ------------------ Missions ------------------
const MISSION_CANDIDATES = [
  { id:'buy_3', text:'Buy 3 different stocks', check: p => (p.buyDifferent||0) >= 3, reward:{coins:60,xp:20} },
  { id:'profit_500', text:'Make $500 profit (day)', check: p => (p.dayProfit||0) >= 500, reward:{coins:120,xp:40} },
  { id:'hold_10', text:'Hold a stock for 10 ticks', check: p => (p.holdTicks||0) >= 10, reward:{coins:80,xp:30} },
  { id:'trade_10', text:'Execute 10 trades', check: p => (p.trades||0) >= 10, reward:{coins:70,xp:25} },
  { id:'buy_food', text:'Buy a Food stock', check: p => (p.typesBought||[]).includes('Food'), reward:{coins:40,xp:12} }
];

function generateDailyMissions(){
  const today = getTodayStr();
  if(state.missionsDate === today && state.missions && state.missions.length === 3) return;
  const pool = [...MISSION_CANDIDATES].sort(()=> Math.random()-0.5).slice(0,3);
  state.missions = pool.map(m => ({ ...m, done:false }));
  state.missionsDate = today;
  saveState();
}
function generateSingleMission(){
  const active = new Set((state.missions||[]).map(m=>m.id));
  const pool = MISSION_CANDIDATES.filter(c => !active.has(c.id));
  if(pool.length === 0) return null;
  return { ...pool[Math.floor(Math.random()*pool.length)], done:false };
}

function renderMissionsModal(){
  const modalList = document.getElementById('missions-list'); if(!modalList) return;
  modalList.innerHTML = '';
  (state.missions || []).forEach((m, idx) => {
    const div = document.createElement('div'); div.className='mission';
    div.style.display='flex'; div.style.justifyContent='space-between'; div.style.alignItems='center'; div.style.marginBottom='8px';
    const statusText = m.done ? 'Completed' : 'In progress';
    const rewardText = m.reward ? `Reward: ${m.reward.coins}c, ${m.reward.xp} XP` : '';
    div.innerHTML = `<div style="max-width:70%"><strong>${m.text}</strong><div style="font-size:0.9em;color:#9aa7b2">${rewardText}</div><div class="meta" style="font-size:0.9em;color:#9aa7b2">${statusText}</div></div><div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">${m.done ? `<button class="action-btn" data-claim="${idx}">Claim</button>` : ''}</div>`;
    modalList.appendChild(div);
  });
}

function renderMissionsBrief(){
  const el = document.getElementById('missions-brief'); if(!el) return;
  el.innerHTML = '';
  (state.missions || []).slice(0,3).forEach(m => { const d=document.createElement('div'); d.textContent = `${m.text}${m.done?' ✅':''}`; el.appendChild(d); });
}

function claimMission(index){
  const idx = Number(index); if(Number.isNaN(idx)) return;
  const m = state.missions[idx]; if(!m || !m.done) return;
  const reward = m.reward || { coins:50, xp:15 };
  state.coins = (state.coins || 0) + (reward.coins || 0);
  state.totalCoinsEarned = (state.totalCoinsEarned || 0) + (reward.coins || 0);
  addXP(reward.xp || 0);
  toast(`Mission claimed: +${reward.coins} coins, +${reward.xp} XP`);
  const newM = generateSingleMission(); if(newM) state.missions[idx] = newM; else state.missions.splice(idx,1);
  saveState(); renderMissionsModal(); renderMissionsBrief(); updateHUD(); updateCash();
}

// ------------------ Shop, Prestige, Leaderboard, News ------------------
const SHOP_ITEMS = [
  { id:'xp_boost_1', name:'XP Booster (1h)', desc:'+50% XP for 1 hour', price:300, effect:{xpMultiplier:1.5, durationMs:3600000} },
  { id:'auto_rebuy', name:'Auto Rebuy (permanent)', desc:'Automatically re-buy small positions', price:1200, effect:{autoRebuy:true} },
  { id:'chart_skin_neon', name:'Chart Skin - Neon', desc:'Cosmetic chart theme', price:200, effect:{cosmetic:'neon'} }
];

function renderShop(){ const el=document.getElementById('shop-items'); if(!el) return; el.innerHTML=''; SHOP_ITEMS.forEach(item=>{ const div=document.createElement('div'); div.className='shop-item'; const owned = !!state.shopOwned[item.id]; div.innerHTML = `<div><strong>${item.name}</strong><div style="font-size:0.9em;color:#9aa7b2">${item.desc}</div></div><div>${owned?'Owned':`<button class="action-btn">Buy ${item.price}c</button>`}</div>`; el.appendChild(div); if(!owned){ const btn=div.querySelector('button'); if(btn) btn.onclick = ()=>{ if(state.coins>=item.price){ state.coins -= item.price; state.shopOwned[item.id]=true; applyShopEffect(item); toast(`Purchased ${item.name}`); saveState(); updateHUD(); renderShop(); } else toast('Not enough coins'); } } }); }
function applyShopEffect(item){ if(item.effect.autoRebuy) state.autoRebuy = true; if(item.effect.cosmetic) state.cosmetic = item.effect.cosmetic; if(item.effect.xpMultiplier){ state.activeBoosts.xpMultiplier = item.effect.xpMultiplier; setTimeout(()=>{ delete state.activeBoosts.xpMultiplier; toast('XP booster expired'); saveState(); }, item.effect.durationMs); } saveState(); }
function canPrestige(){ return state.level >= 20; }
function doPrestige(){ if(!canPrestige()){ toast('Reach level 20 to prestige'); return; } const legacyGain = Math.floor(state.level/5); state.prestige.count += 1; state.prestige.legacyPoints += legacyGain; state.xp = 0; state.level = 1; state.coins = 0; state.achievements = {}; state.missions = []; state.missionsDate = null; toast(`Prestiged! +${legacyGain} legacy points`); launchConfetti(80); saveState(); updateHUD(); updateCash(); }

function renderLeaderboard(){ const ul=document.getElementById('scores'); if(!ul) return; const list=(state.leaderboard||[]).filter(s=>s.season===state.seasonId).sort((a,b)=>b.value-a.value).slice(0,10); ul.innerHTML=''; list.forEach(item=>{ const li=document.createElement('li'); li.innerHTML=`<strong>${item.name}</strong>: <span class="price-up">$${(+item.value).toFixed(2)}</span>`; ul.appendChild(li); }); }
function saveLeaderboardEntry(name='Player'){ const entry={ name, value:+getPortfolioValue().toFixed(2), ts:new Date().toISOString(), season: state.seasonId }; state.leaderboard = state.leaderboard || []; state.leaderboard.push(entry); localStorage.setItem('leaderboard_scores', JSON.stringify(state.leaderboard)); renderLeaderboard(); }

const NEWS_EVENTS = [
  { type: "stock", symbol: "ZOOMX", text: "Zoomix launches new AI chip — big upside", effect: 0.22, mood: "good" },
  { type: "stock", symbol: "FRUIQ", text: "FruityQ seasonal recall — selloff", effect: -0.11, mood: "bad" },
  { type: "type", target: "Energy", text: "Energy subsidies announced.", effect: 0.08, mood:"good"},
  { type: "market", text: "Market rally: broad gains.", effect: 0.10, mood:"good"},
  { type: "market", text: "Market sell-off: volatility spikes.", effect: -0.14, mood:"bad"}
];

function triggerRandomNews(){ const news = NEWS_EVENTS[Math.floor(Math.random()*NEWS_EVENTS.length)]; const el=document.getElementById('news-content'); if(el) el.textContent = news.text; const map={}; if(news.type==='stock') map[news.symbol]=news.effect; else if(news.type==='type') STOCKS.forEach(s=>{ if(s.type===news.target) map[s.symbol]=news.effect; }); else STOCKS.forEach(s=>map[s.symbol]=news.effect); if(news.mood==='good') addXP(5 + Math.round(Math.abs(news.effect)*100)); if(news.mood==='bad') addXP(2); addEventToList(news.text); return map; }
function addEventToList(text){ const ul=document.getElementById('events-list'); if(!ul) return; const li=document.createElement('li'); li.textContent = `${new Date().toLocaleTimeString()} — ${text}`; ul.insertBefore(li, ul.firstChild); while(ul.children.length>8) ul.removeChild(ul.lastChild); }

// ------------------ Price simulation ------------------
function setRandomPrices(newsEffectMap = {}){
  prevPrices = { ...prices };
  STOCKS.forEach(stock => {
    let old = prices[stock.symbol] || randomPrice();
    let change = (Math.random()*0.07) - 0.035;
    if(Math.random() < 0.10) change += (Math.random()*0.06 - 0.03);
    if(newsEffectMap[stock.symbol]) change += newsEffectMap[stock.symbol];
    change = Math.max(-0.5, Math.min(0.5, change));
    prices[stock.symbol] = Math.max(5, +(old * (1 + change)).toFixed(2));
  });
}

// ------------------ Chart helpers ------------------
function pushChartSample(value){
  if(!portfolioChart) return;
  const nowLabel = new Date().toLocaleTimeString();
  chartData.labels.push(nowLabel);
  chartData.datasets[0].data.push(+value.toFixed(2));
  const maxSamples = 300;
  while(chartData.labels.length > maxSamples){ chartData.labels.shift(); chartData.datasets[0].data.shift(); }
  portfolioChart.update();
}

// ------------------ Watchlist / Order History ------------------
let watchlist = [];
function renderWatchlist(){ const wrap=document.getElementById('watchlist'); if(!wrap) return; wrap.innerHTML=''; watchlist.forEach(sym=>{ const div=document.createElement('div'); div.style.display='flex'; div.style.justifyContent='space-between'; div.style.alignItems='center'; div.style.marginBottom='6px'; const price=(prices[sym]!==undefined)?`$${prices[sym].toFixed(2)}`:'—'; div.innerHTML = `<div style="font-weight:700">${sym}</div><div style="color:#9aa7b2">${price} <button class="action-btn" data-remove="${sym}" style="margin-left:8px;">Remove</button></div>`; wrap.appendChild(div); const btn=div.querySelector('button'); if(btn) btn.onclick = ()=>{ watchlist = watchlist.filter(s=>s!==sym); renderWatchlist(); }; }); }
window.orderHistory = window.orderHistory || [];

// ------------------ Table updates & Trading ------------------
function updateStockTable(){ const tbody=document.getElementById('stock-table'); if(!tbody) return; tbody.innerHTML=''; STOCKS.forEach(stock=>{ const p=(prices[stock.symbol]!==undefined)?prices[stock.symbol]:0; const change=+(p-(prevPrices[stock.symbol]||p)); const changeStr=(change>0?'+':'')+change.toFixed(2); const className = change>0?'price-up':change<0?'price-down':'price-same'; const tr=document.createElement('tr'); tr.innerHTML=`<td>${stock.symbol}</td><td>${stock.type}</td><td>$${p.toFixed(2)}</td><td class="${className}">${changeStr}</td><td></td>`; tbody.appendChild(tr); }); }
function updateTradeTable(){ const tbody=document.getElementById('trade-table'); if(!tbody) return; tbody.innerHTML=''; STOCKS.forEach(stock=>{ const p=(prices[stock.symbol]!==undefined)?prices[stock.symbol]:0; const change=+(p-(prevPrices[stock.symbol]||p)); const changeStr=(change>0?'+':'')+change.toFixed(2); const className=change>0?'price-up':change<0?'price-down':'price-same'; const rowId=`buy_${stock.symbol}`, costId=`buy_cost_${stock.symbol}`; const tr=document.createElement('tr'); tr.innerHTML=`<td>${stock.symbol}</td><td>${stock.type}</td><td>$${p.toFixed(2)}</td><td class="${className}">${changeStr}</td><td><input type="number" min="1" value="1" class="buy-input" id="${rowId}"><button onclick="buyStock('${stock.symbol}')" class="action-btn">Buy</button><span class="buy-cost" id="${costId}">$${p.toFixed(2)}</span></td>`; tbody.appendChild(tr); setTimeout(()=>{ const qtyInput=document.getElementById(rowId), costSpan=document.getElementById(costId); if(qtyInput && costSpan){ function updateCost(){ let q=parseInt(qtyInput.value)||0; costSpan.textContent=`$${(q*p).toFixed(2)}`; } qtyInput.addEventListener('input', updateCost); updateCost(); } },0); }); }
function updatePortfolioTable(){ const tbody=document.getElementById('portfolio-table'); if(!tbody) return; tbody.innerHTML=''; STOCKS.forEach(stock=>{ const owned=portfolio.stocks[stock.symbol]||0; if(owned>0){ const p=(prices[stock.symbol]!==undefined)?prices[stock.symbol]:0; const totalValue=owned*p; const profitLoss=(p-averageBuyPrice[stock.symbol])*owned; const changeStr=(profitLoss>0?'+':'')+profitLoss.toFixed(2); const className=profitLoss>0?'price-up':profitLoss<0?'price-down':'price-same'; const tr=document.createElement('tr'); tr.innerHTML=`<td>${stock.symbol}</td><td>${owned}</td><td>$${p.toFixed(2)}</td><td>$${totalValue.toFixed(2)}</td><td class="${className}">${changeStr}</td><td style="white-space:nowrap;min-width:200px;"><input type="number" min="1" value="1" id="sell_${stock.symbol}" style="width:40px;"><button class="sell-btn action-btn" onclick="sellStock('${stock.symbol}')">Sell</button><button class="sell-all-btn action-btn" onclick="sellAllStock('${stock.symbol}')">Sell All</button></td>`; tbody.appendChild(tr); } }); }

window.buyStock = function(symbol){
  const input = document.getElementById(`buy_${symbol}`);
  let qty = input ? parseInt(input.value) : 1; qty = Math.max(1, qty || 1);
  const cost = (prices[symbol] || 0) * qty;
  if(cost <= portfolio.cash){
    const prevQty = portfolio.stocks[symbol] || 0;
    const totalQty = prevQty + qty;
    averageBuyPrice[symbol] = (averageBuyPrice[symbol]*prevQty + prices[symbol]*qty)/Math.max(1,totalQty);
    portfolio.cash -= cost;
    portfolio.stocks[symbol] = totalQty;
    dayProgress.trades = (dayProgress.trades||0)+1;
    state.tradeCount = (state.tradeCount||0) + 1;
    if(!dayProgress.typesBought) dayProgress.typesBought = [];
    const type = (STOCKS.find(s=>s.symbol===symbol) || {}).type;
    if(type && !dayProgress.typesBought.includes(type)) dayProgress.typesBought.push(type);
    if(!state.firstTradeDone){ state.firstTradeDone = true; saveState(); }
    addXP(Math.max(1, Math.round(cost/200)));
    state.coins += Math.max(0, Math.round(cost/1000));
    recordOrder('buy', symbol, qty, prices[symbol]);
    toast(`Bought ${qty} ${symbol} for ${formatCurrency(cost)}`);
    saveState(); updateHUD(); updateCash(); updatePortfolioTable(); updateTradeTable(); updateStockTable(); renderWatchlist();
    checkMissions(); checkAchievements();
  } else {
    toast('Not enough cash');
  }
};

window.sellStock = function(symbol){
  const input = document.getElementById(`sell_${symbol}`);
  let qty = input ? parseInt(input.value) : 1; qty = Math.max(1, qty || 1);
  const owned = portfolio.stocks[symbol] || 0;
  if(qty > owned){ toast('Not enough shares'); return; }
  const revenue = (prices[symbol] || 0) * qty;
  portfolio.cash += revenue;
  portfolio.stocks[symbol] = owned - qty;
  if(portfolio.stocks[symbol] === 0){
    averageBuyPrice[symbol] = 0;
    // reset per-stock hold counter when fully sold
    perStockHoldTicks[symbol] = 0;
  }
  const profit = (prices[symbol] - averageBuyPrice[symbol]) * qty;
  if(profit > 0){
    addXP(Math.round(profit/10));
    state.coins += Math.round(profit/50);
    dayProgress.dayProfit = (dayProgress.dayProfit || 0) + profit;
    state.cumulativeProfit = (state.cumulativeProfit || 0) + profit;
  }
  state.tradeCount = (state.tradeCount||0) + 1;
  state.firstSaleDone = state.firstSaleDone || true;
  recordOrder('sell', symbol, qty, prices[symbol]);
  toast(`Sold ${qty} ${symbol} for ${formatCurrency(revenue)}`);
  saveState(); updateHUD(); updateCash(); updatePortfolioTable(); updateTradeTable(); updateStockTable();
  checkMissions(); checkAchievements();
};

window.sellAllStock = function(symbol){ const owned = portfolio.stocks[symbol] || 0; if(owned>0){ const inpt=document.getElementById(`sell_${symbol}`); if(inpt) inpt.value = owned; sellStock(symbol); } };

// ------------------ Ticks: update per-stock hold counters ------------------
let priceInterval = null, newsInterval = null;
function tickPrices(){
  try {
    setRandomPrices({});
    updateStockTable(); updateTradeTable(); updatePortfolioTable();
    pushChartSample(getPortfolioValue());
    tickCount++;

    // increment per-stock hold counters only for symbols currently held
    let maxHold = 0;
    STOCKS.forEach(s => {
      const sym = s.symbol;
      if(portfolio.stocks[sym] && portfolio.stocks[sym] > 0){
        perStockHoldTicks[sym] = (perStockHoldTicks[sym] || 0) + 1;
      } else {
        perStockHoldTicks[sym] = 0;
      }
      if(perStockHoldTicks[sym] > maxHold) maxHold = perStockHoldTicks[sym];
    });
    dayProgress.holdTicks = maxHold;

    checkMissions(); checkAchievements(); updateHUD();
  } catch(e){ console.error('tickPrices error', e); }
}
function newsTick(){
  try { const map = triggerRandomNews(); setRandomPrices(map); updateStockTable(); updateTradeTable(); updatePortfolioTable(); pushChartSample(getPortfolioValue()); renderLeaderboard(); saveState(); } catch(e){ console.error('newsTick error', e); }
}

// ------------------ Missions check ------------------
function checkMissions(){
  dayProgress.buyDifferent = Object.values(portfolio.stocks).filter(v => v > 0).length;
  dayProgress.trades = dayProgress.trades || 0;
  dayProgress.typesBought = dayProgress.typesBought || [];
  (state.missions || []).forEach(m => {
    if(m.done) return;
    try {
      if(typeof m.check === 'function' ? m.check(dayProgress) : false) m.done = true;
      else {
        const candidate = MISSION_CANDIDATES.find(c => c.id === m.id);
        if(candidate && candidate.check(dayProgress)) m.done = true;
      }
    } catch(e){
      // fallback checks
      if(m.id === 'buy_3' && dayProgress.buyDifferent >= 3) m.done = true;
      if(m.id === 'profit_500' && (dayProgress.dayProfit || 0) >= 500) m.done = true;
      if(m.id === 'hold_10' && (dayProgress.holdTicks || 0) >= 10) m.done = true;
      if(m.id === 'trade_10' && (dayProgress.trades || 0) >= 10) m.done = true;
      if(m.id === 'buy_food' && (dayProgress.typesBought || []).includes('Food')) m.done = true;
    }
  });
  renderMissionsModal();
}

// ------------------ Utility helpers ------------------
function getPortfolioValue(){ let total = portfolio.cash || 0; for(let i=0;i<STOCKS.length;i++){ const s=STOCKS[i]; const sym = s.symbol; const owned = portfolio.stocks[sym] || 0; const p = (prices[sym] !== undefined) ? prices[sym] : 0; total += owned * p; } return +total; }
function setRandomPrices(newsEffectMap = {}){
  prevPrices = {...prices};
  STOCKS.forEach(stock => {
    let old = prices[stock.symbol] || randomPrice();
    let change = (Math.random()*0.07) - 0.035;
    if(Math.random() < 0.10) change += (Math.random()*0.06 - 0.03);
    if(newsEffectMap[stock.symbol]) change += newsEffectMap[stock.symbol];
    change = Math.max(-0.5, Math.min(0.5, change));
    prices[stock.symbol] = Math.max(5, +(old * (1 + change)).toFixed(2));
  });
}

// ------------------ DOMContentLoaded startup ------------------
document.addEventListener('DOMContentLoaded', ()=>{
  // initialize chart safely after DOM is ready
  const canvas = document.getElementById('portfolioChart');
  if(canvas && typeof Chart !== 'undefined'){
    const ctx = canvas.getContext('2d');
    const initialTime = new Date().toLocaleTimeString();
    chartData.labels.push(initialTime);
    chartData.datasets[0].data.push(getPortfolioValue());
    portfolioChart = new Chart(ctx, { type:'line', data: chartData, options:{ animation:{duration:300}, scales:{ x:{display:false}, y:{display:false}}, plugins:{ legend:{display:false} } } });
  }

  // rename modal missions header (if present) and wire delegated claim handler
  const modalM = document.getElementById('modal-missions');
  if(modalM){
    const h3 = modalM.querySelector('h3'); if(h3) h3.textContent = 'Missions';
    modalM.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-claim]');
      if(btn){ const idx = btn.getAttribute('data-claim'); claimMission(idx); }
    });
  }

  try{ generateDailyMissions(); } catch(e){ console.warn(e); }
  try{ renderMissionsModal(); renderMissionsBrief(); } catch(e){}
  try{ renderShop(); renderAchievements(); renderLeaderboard(); } catch(e){}
  try{ updateHUD(); } catch(e){}
  try{ updateCash(); } catch(e){}
  try{ updateStockTable(); updateTradeTable(); updatePortfolioTable(); } catch(e){ console.warn(e); }

  if(priceInterval) clearInterval(priceInterval); priceInterval = setInterval(tickPrices, 10000);
  if(newsInterval) clearInterval(newsInterval); newsInterval = setInterval(newsTick, 180000);

  // UI wiring (guarded)
  const openMBtn = document.getElementById('open-missions'); if(openMBtn) openMBtn.onclick = ()=> openModal('modal-missions');
  const closeMBtn = document.getElementById('close-missions'); if(closeMBtn) closeMBtn.onclick = ()=> closeModal('modal-missions');
  const openABtn = document.getElementById('open-achievements'); if(openABtn) openABtn.onclick = ()=> { renderAchievements(); openModal('modal-achievements'); };
  const closeABtn = document.getElementById('close-achievements'); if(closeABtn) closeABtn.onclick = ()=> closeModal('modal-achievements');
  const openSBtn = document.getElementById('open-shop'); if(openSBtn) openSBtn.onclick = ()=> { renderShop(); openModal('modal-shop'); };
  const closeSBtn = document.getElementById('close-shop'); if(closeSBtn) closeSBtn.onclick = ()=> closeModal('modal-shop');
  const saveBtn = document.getElementById('save-score'); if(saveBtn) saveBtn.onclick = ()=> { saveLeaderboardEntry(); toast('Score saved to local leaderboard'); };
  const addWatchBtn = document.getElementById('add-watch'); if(addWatchBtn) addWatchBtn.onclick = ()=> {
    const inp = document.getElementById('watch-input'); const sym = (inp && inp.value || '').trim().toUpperCase();
    if(sym && STOCKS.find(s=>s.symbol===sym) && !watchlist.includes(sym)){ watchlist.push(sym); renderWatchlist(); if(inp) inp.value=''; toast(`${sym} added to watchlist`); } else toast('Invalid symbol or already watched');
  };

  setInterval(updateSeasonTimer, 1000);
  checkAchievements();
});

// ------------------ Modal helpers ------------------
function openModal(id){ const m=document.getElementById(id); if(m) m.setAttribute('aria-hidden','false'); }
function closeModal(id){ const m=document.getElementById(id); if(m) m.setAttribute('aria-hidden','true'); }
function getSeasonId(){ const d=new Date(); const onejan=new Date(d.getFullYear(),0,1); const days=Math.floor((d-onejan)/(24*60*60*1000)); const week=Math.ceil((days+onejan.getDay()+1)/7); return `${d.getFullYear()}-W${week}`; }

// persist and global error reporting
saveState();
window.onerror = function(message, source, lineno, colno, error){
  console.error('Global error:', message, 'at', source+':'+lineno+':'+colno, error);
  try {
    const toasts = document.getElementById('toasts');
    if(toasts){
      const el = document.createElement('div'); el.className = 'toast';
      el.textContent = `Error: ${message} (line ${lineno})`;
      toasts.appendChild(el);
      setTimeout(()=> el.remove(), 8000);
    }
  } catch(e){}
  return false;
};
