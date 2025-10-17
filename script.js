// Full game script with progression, missions, achievements, shop, prestige, events, leaderboards.
// Stocks tick every 10s; news every 3 minutes; chart appends a sample every tick.

// ------------------ Data and Initial State ------------------
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
STOCKS.forEach(s => portfolio.stocks[s.symbol] = 0);

let prevOwned = {}, averageBuyPrice = {};
STOCKS.forEach(s => { prevOwned[s.symbol] = 0; averageBuyPrice[s.symbol] = 0; });

let prices = {}, prevPrices = {};
function randomPrice(){ return +(Math.random()*900+100).toFixed(2); }
function initPricesIfNeeded(){ STOCKS.forEach(s => { if (!prices[s.symbol]) prices[s.symbol] = randomPrice(); }); }
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
    // active temporary boosters
    activeBoosts: {}
};

function loadState(){
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw) Object.assign(state, JSON.parse(raw));
    }catch(e){ console.warn('loadState', e); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
loadState();

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

// ------------------ XP / Leveling ------------------
function xpForLevel(l){ return Math.floor(100 * Math.pow(l,1.35)); }
function addXP(amount){
    if(amount<=0) return;
    // check boosts
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
        unlockAchievement('level_up', `Reached level ${state.level}`);
    }
    if(gained) saveState();
}
function updateHUD(){
    const elLevel = document.getElementById('level');
    const elCoins = document.getElementById('coins');
    if(elLevel) elLevel.textContent = state.level;
    if(elCoins) elCoins.textContent = state.coins;
    const bar = document.getElementById('xp-bar');
    if(bar) {
        const pct = Math.min(100, Math.round( (state.xp / xpForLevel(state.level)) * 100 ));
        bar.style.width = pct + '%';
    }
    const info = document.getElementById('next-level-info');
    if(info) info.textContent = `XP ${state.xp}/${xpForLevel(state.level)} (+${Math.ceil(xpForLevel(state.level)-state.xp)} to next)`;
}

// ------------------ Achievements ------------------
const ACHIEVEMENT_LIST = [
    { id:'first_trade', name:'First Trade', desc:'Make your first trade', coins:50 },
    { id:'profit_1000', name:'Profit $1,000', desc:'Accumulate $1,000 profit total', coins:150 },
    { id:'hold_50ticks', name:'Patient Investor', desc:'Hold a stock for 50 ticks', coins:200 },
    { id:'level_10', name:'Rising Star', desc:'Reach level 10', coins:300 }
];
function unlockAchievement(id, note=''){
    if(state.achievements[id]) return;
    const spec = ACHIEVEMENT_LIST.find(a=>a.id===id);
    state.achievements[id] = { unlockedAt: new Date().toISOString(), note };
    if(spec) {
        state.coins += spec.coins;
        toast(`Achievement unlocked: ${spec.name} (+${spec.coins} coins)`);
    } else {
        toast(`Achievement unlocked: ${id}`);
    }
    saveState(); renderAchievements();
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
            <div>${unlocked ? 'Unlocked' : `<button class="action-btn">Claim ${a.coins}c</button>`}</div>`;
        el.appendChild(div);
        if(!unlocked){
            div.querySelector('button').onclick = ()=> { unlockAchievement(a.id); };
        }
    });
}

// ------------------ Daily Missions ------------------
function getTodayStr(){ return new Date().toISOString().slice(0,10); }
function generateDailyMissions(){
    const today = getTodayStr();
    if(state.missionsDate === today && state.missions && state.missions.length) return;
    const candidates = [
        { id:'buy_3', text:'Buy 3 different stocks', checkKey:'buyDifferent', reward:{coins:60,xp:20} },
        { id:'profit_500', text:'Make $500 profit (day)', checkKey:'dayProfit', reward:{coins:120,xp:40} },
        { id:'hold_10', text:'Hold a stock for 10 ticks', checkKey:'holdTicks', reward:{coins:80,xp:30} },
        { id:'trade_10', text:'Execute 10 trades', checkKey:'trades', reward:{coins:70,xp:25} },
        { id:'buy_food', text:'Buy a Food stock', checkKey:'typesBought', reward:{coins:40,xp:12} }
    ];
    const shuffled = candidates.sort(()=> Math.random()-0.5).slice(0,3);
    state.missions = shuffled.map(m => ({...m, progress:0, done:false}));
    state.missionsDate = today;
    saveState();
}
function renderMissionsModal(){
    const modalList = document.getElementById('missions-modal-list');
    if(!modalList) return;
    modalList.innerHTML = '';
    state.missions.forEach((m, idx)=>{
        const div = document.createElement('div');
        div.className='mission';
        div.innerHTML = `<div><strong>${m.text}</strong><div class="meta">${m.done ? 'Completed' : 'In progress'}</div></div>
            <div>${m.done ? `<button class="action-btn" data-claim="${idx}">Claim</button>` : ''}</div>`;
        modalList.appendChild(div);
        if(m.done) div.querySelector('button').onclick = ()=> claimMission(idx);
    });
}
function claimMission(idx){
    const m = state.missions[idx];
    if(!m || m.done===false) return;
    state.coins += (m.reward.coins || 0);
    addXP(m.reward.xp || 0);
    toast(`Mission claimed: +${m.reward.coins} coins, +${m.reward.xp} XP`);
    state.missions.splice(idx,1);
    saveState();
    renderMissionsModal();
}

// quick in-memory day progress
let dayProgress = { buyDifferent:0, dayProfit:0, holdTicks:0, trades:0, typesBought:[] };

// ------------------ Shop & Upgrades ------------------
const SHOP_ITEMS = [
    { id:'xp_boost_1', name:'XP Booster (1h)', desc:'+50% XP for 1 hour', price:300, effect:{xpMultiplier:1.5, durationMs:3600000} },
    { id:'auto_rebuy', name:'Auto Rebuy (permanent)', desc:'Automatically re-buy small positions', price:1200, effect:{autoRebuy:true} },
    { id:'chart_skin_neon', name:'Chart Skin - Neon', desc:'Cosmetic chart theme', price:200, effect:{cosmetic:'neon'} }
];
function renderShop(){
    const el = document.getElementById('shop-items');
    if(!el) return;
    el.innerHTML = '';
    SHOP_ITEMS.forEach(item=>{
        const div = document.createElement('div');
        div.className = 'shop-item';
        const owned = !!state.shopOwned[item.id];
        div.innerHTML = `<div><strong>${item.name}</strong><div style="font-size:0.9em;color:#9aa7b2">${item.desc}</div></div>
            <div>${owned ? 'Owned' : `<button class="action-btn">Buy ${item.price}c</button>`}</div>`;
        el.appendChild(div);
        if(!owned){
            div.querySelector('button').onclick = ()=> {
                if(state.coins >= item.price){
                    state.coins -= item.price;
                    state.shopOwned[item.id] = true;
                    applyShopEffect(item);
                    toast(`Purchased ${item.name}`);
                    saveState();
                    updateHUD();
                    renderShop();
                } else {
                    toast('Not enough coins');
                }
            };
        }
    });
}
function applyShopEffect(item){
    if(item.effect.autoRebuy) state.autoRebuy = true;
    if(item.effect.cosmetic) state.cosmetic = item.effect.cosmetic;
    if(item.effect.xpMultiplier){
        state.activeBoosts.xpMultiplier = item.effect.xpMultiplier;
        setTimeout(()=> { delete state.activeBoosts.xpMultiplier; toast('XP booster expired'); saveState(); }, item.effect.durationMs);
    }
    saveState();
}

// ------------------ Prestige / Rebirth ------------------
function canPrestige(){ return state.level >= 20; }
function doPrestige(){
    if(!canPrestige()) { toast('Reach level 20 to prestige'); return; }
    const legacyGain = Math.floor(state.level / 5);
    state.prestige.count += 1;
    state.prestige.legacyPoints += legacyGain;
    state.xp = 0; state.level = 1; state.coins = 0; state.achievements = {}; state.missions = []; state.missionsDate = null;
    toast(`Prestiged! +${legacyGain} legacy points`);
    saveState(); updateHUD();
}

// ------------------ Leaderboard (Seasonal, local) ------------------
function getSeasonId(){
    const d = new Date();
    const onejan = new Date(d.getFullYear(),0,1);
    const days = Math.floor((d - onejan) / (24*60*60*1000));
    const week = Math.ceil((days + onejan.getDay()+1)/7);
    return `${d.getFullYear()}-W${week}`;
}
function updateSeasonTimer(){
    const el = document.getElementById('season-timer');
    if(!el) return;
    const now = new Date();
    const day = now.getDay();
    const daysLeft = (7 - day) % 7;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()+daysLeft+1);
    const diff = end - now;
    const hrs = String(Math.floor(diff/3600000)).padStart(2,'0');
    const mins = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
    const secs = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    el.textContent = `${hrs}:${mins}:${secs}`;
}
function saveLeaderboardEntry(name='Player'){
    const entry = { name, value: +getPortfolioValue().toFixed(2), ts: new Date().toISOString(), season: state.seasonId };
    state.leaderboard = state.leaderboard || [];
    state.leaderboard.push(entry);
    localStorage.setItem('leaderboard_scores', JSON.stringify(state.leaderboard));
    renderLeaderboard();
}
function renderLeaderboard(){
    const ul = document.getElementById('scores');
    if(!ul) return;
    const list = (state.leaderboard || []).filter(s=>s.season === state.seasonId).sort((a,b)=>b.value-a.value).slice(0,10);
    ul.innerHTML = '';
    list.forEach(item=>{
        const li = document.createElement('li');
        li.innerHTML = `<strong>${item.name}</strong>: <span class="price-up">$${(+item.value).toFixed(2)}</span>`;
        ul.appendChild(li);
    });
}

// ------------------ News & Events ------------------
const NEWS_EVENTS = [
    { type: "stock", symbol: "ZOOMX", text: "Zoomix launches new AI chip — big upside", effect: 0.22, mood: "good" },
    { type: "stock", symbol: "FRUIQ", text: "FruityQ seasonal recall — selloff", effect: -0.11, mood: "bad" },
    { type: "type", target: "Energy", text: "Energy subsidies announced.", effect: 0.08, mood:"good"},
    { type: "market", text: "Market rally across sectors", effect: 0.10, mood:"good"},
    { type: "market", text: "Market sell-off volatility spikes", effect: -0.14, mood:"bad"},
];
function triggerRandomNews(){
    const news = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    const el = document.getElementById("news-content");
    if(el) el.textContent = news.text;
    const newsEffectMap = {};
    if(news.type === 'stock') newsEffectMap[news.symbol] = news.effect;
    else if(news.type === 'type') STOCKS.forEach(s => { if(s.type===news.target) newsEffectMap[s.symbol] = news.effect; });
    else if(news.type === 'market') STOCKS.forEach(s => newsEffectMap[s.symbol] = news.effect);
    if(news.mood === 'good') addXP(5 + Math.round(Math.abs(news.effect)*100));
    if(news.mood === 'bad') addXP(2);
    return newsEffectMap;
}

// ------------------ Price Simulation and Chart ------------------
function setRandomPrices(newsEffectMap = {}){
    prevPrices = {...prices};
    STOCKS.forEach(stock=>{
        let oldPrice = prices[stock.symbol] || randomPrice();
        let changePercent = (Math.random()*0.07) - 0.035;
        if(Math.random()<0.10) changePercent += (Math.random()*0.06 - 0.03);
        if(newsEffectMap[stock.symbol]) changePercent += newsEffectMap[stock.symbol];
        changePercent = Math.max(-0.5, Math.min(0.5, changePercent));
        let newPrice = oldPrice * (1 + changePercent);
        prices[stock.symbol] = Math.max(5, +newPrice.toFixed(2));
    });
}

// ------------------ Chart ------------------
let portfolioHistory = [];
let tickCount = 0;
let ctx = document.getElementById('portfolioChart').getContext('2d');
let initialTime = new Date().toLocaleTimeString();
portfolioHistory.push(getPortfolioValue());
let chartData = { labels:[initialTime], datasets:[{ label:'Portfolio Value', data:[portfolioHistory[0]], borderColor:'#00FC87', backgroundColor:'rgba(14,210,247,0.10)', fill:true, tension:0.28 }] };
let portfolioChart = new Chart(ctx, { type:'line', data:chartData, options:{ animation:{duration:300}, scales:{ x:{ display:false }, y:{ display:false }}, plugins:{ legend:{display:false}} } });
function pushChartSample(value){
    const nowLabel = new Date().toLocaleTimeString();
    chartData.labels.push(nowLabel);
    chartData.datasets[0].data.push(+value.toFixed(2));
    const maxSamples = 300;
    while(chartData.labels.length > maxSamples){ chartData.labels.shift(); chartData.datasets[0].data.shift(); }
    portfolioChart.update();
}

// ------------------ UI Table Updates ------------------
function updateStockTable(){
    const tbody = document.getElementById('stock-table'); if(!tbody) return;
    tbody.innerHTML = '';
    STOCKS.forEach(stock=>{
        const price = prices[stock.symbol];
        const change = +(price - (prevPrices[stock.symbol] || price));
        const changeStr = (change>0?'+':'') + change.toFixed(2);
        const className = change>0 ? 'price-up' : change<0 ? 'price-down' : 'price-same';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${stock.symbol}</td><td>${stock.type}</td><td>$${price.toFixed(2)}</td><td class="${className}">${changeStr}</td><td></td>`;
        tbody.appendChild(tr);
    });
}
function updateTradeTable(){
    const tbody = document.getElementById('trade-table'); if(!tbody) return;
    tbody.innerHTML = '';
    STOCKS.forEach(stock=>{
        const price = prices[stock.symbol];
        const change = +(price - (prevPrices[stock.symbol] || price));
        const changeStr = (change>0?'+':'') + change.toFixed(2);
        const className = change>0 ? 'price-up' : change<0 ? 'price-down' : 'price-same';
        const rowId = `buy_${stock.symbol}`, costId = `buy_cost_${stock.symbol}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${stock.symbol}</td><td>${stock.type}</td><td>$${price.toFixed(2)}</td><td class="${className}">${changeStr}</td>
            <td>
                <input type="number" min="1" value="1" class="buy-input" id="${rowId}">
                <button onclick="buyStock('${stock.symbol}')" class="action-btn">Buy</button>
                <span class="buy-cost" id="${costId}">$${price.toFixed(2)}</span>
            </td>`;
        tbody.appendChild(tr);
        setTimeout(()=>{
            const qtyInput = document.getElementById(rowId), costSpan = document.getElementById(costId);
            if(qtyInput && costSpan){ function updateCost(){ let qty = parseInt(qtyInput.value)||0; costSpan.textContent = `$${(qty*price).toFixed(2)}`; } qtyInput.addEventListener('input', updateCost); updateCost(); }
        },0);
    });
}
function updatePortfolioTable(){
    const tbody = document.getElementById('portfolio-table'); if(!tbody) return;
    tbody.innerHTML = '';
    STOCKS.forEach(stock=>{
        const owned = portfolio.stocks[stock.symbol] || 0;
        if(owned>0){
            const price = prices[stock.symbol];
            const totalValue = owned * price;
            const profitLoss = (price - averageBuyPrice[stock.symbol]) * owned;
            const changeStr = (profitLoss>0?'+':'') + profitLoss.toFixed(2);
            const className = profitLoss>0 ? 'price-up' : profitLoss<0 ? 'price-down' : 'price-same';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${stock.symbol}</td><td>${owned}</td><td>$${price.toFixed(2)}</td><td>$${totalValue.toFixed(2)}</td>
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

// ------------------ Trading Logic ------------------
window.buyStock = function(symbol){
    const input = document.getElementById(`buy_${symbol}`);
    let qty = input ? parseInt(input.value) : 1; qty = Math.max(1, qty||1);
    const cost = (prices[symbol]||0) * qty;
    if(cost <= portfolio.cash){
        const prevQty = portfolio.stocks[symbol] || 0;
        const totalQty = prevQty + qty;
        averageBuyPrice[symbol] = (averageBuyPrice[symbol] * prevQty + prices[symbol] * qty) / Math.max(1,totalQty);
        portfolio.cash -= cost;
        portfolio.stocks[symbol] = totalQty;
        dayProgress.trades = (dayProgress.trades||0)+1;
        if(!dayProgress.typesBought) dayProgress.typesBought = [];
        const type = STOCKS.find(s=>s.symbol===symbol).type;
        if(!dayProgress.typesBought.includes(type)) dayProgress.typesBought.push(type);
        addXP(Math.max(1, Math.round(cost/200)));
        state.coins += Math.max(0, Math.round(cost/1000));
        toast(`Bought ${qty} ${symbol} for ${formatCurrency(cost)}`);
        saveState(); updateHUD(); updatePortfolioTable(); updateTradeTable(); updateStockTable();
    } else {
        toast('Not enough cash');
    }
};
window.sellStock = function(symbol){
    const input = document.getElementById(`sell_${symbol}`);
    let qty = input ? parseInt(input.value) : 1; qty = Math.max(1, qty||1);
    const owned = portfolio.stocks[symbol] || 0;
    if(qty > owned) { toast('Not enough shares'); return; }
    const revenue = (prices[symbol]||0) * qty;
    portfolio.cash += revenue;
    portfolio.stocks[symbol] = owned - qty;
    if(portfolio.stocks[symbol]===0){ averageBuyPrice[symbol]=0; prevOwned[symbol]=0; }
    const profit = (prices[symbol] - averageBuyPrice[symbol]) * qty;
    if(profit>0){
        addXP(Math.round(profit/10));
        state.coins += Math.round(profit/50);
        dayProgress.dayProfit = (dayProgress.dayProfit||0) + profit;
    }
    toast(`Sold ${qty} ${symbol} for ${formatCurrency(revenue)}`);
    saveState(); updateHUD(); updatePortfolioTable(); updateTradeTable(); updateStockTable();
};
window.sellAllStock = function(symbol){
    const owned = portfolio.stocks[symbol] || 0;
    if(owned>0) { document.getElementById(`sell_${symbol}`) && (document.getElementById(`sell_${symbol}`).value = owned); sellStock(symbol); }
}

// ------------------ Auto Ticks & Intervals ------------------
let priceInterval = null, newsInterval = null;
function tickPrices(){
    const newsMap = {};
    setRandomPrices(newsMap);
    updateTradeTable(); updateStockTable(); updatePortfolioTable();
    const val = getPortfolioValue(); pushChartSample(val);
    tickCount++;
    STOCKS.forEach(s => { if(portfolio.stocks[s.symbol]>0) dayProgress.holdTicks = (dayProgress.holdTicks||0)+1; });
    checkMissions(); updateHUD();
}
function newsTick(){
    const newsMap = triggerRandomNews();
    setRandomPrices(newsMap);
    updateTradeTable(); updateStockTable(); updatePortfolioTable();
    const val = getPortfolioValue(); pushChartSample(val);
    renderLeaderboard();
    saveState();
}
window.addEventListener('DOMContentLoaded', ()=>{
    generateDailyMissions(); renderMissionsModal(); renderShop(); renderAchievements(); renderLeaderboard(); updateHUD();
    updateStockTable(); updateTradeTable(); updatePortfolioTable();
    portfolioChart.data.datasets[0].data[0] = +getPortfolioValue().toFixed(2); portfolioChart.update();
    if(priceInterval) clearInterval(priceInterval); priceInterval = setInterval(tickPrices, 10000);
    if(newsInterval) clearInterval(newsInterval); newsInterval = setInterval(newsTick, 180000);
    document.getElementById('btn-shop').onclick = ()=> openModal('modal-shop');
    document.getElementById('close-shop').onclick = ()=> closeModal('modal-shop');
    document.getElementById('btn-achievements').onclick = ()=> openModal('modal-achievements');
    document.getElementById('close-achievements').onclick = ()=> closeModal('modal-achievements');
    document.getElementById('btn-missions').onclick = ()=> openModal('modal-missions');
    document.getElementById('close-missions').onclick = ()=> closeModal('modal-missions');
    document.getElementById('save-score').onclick = ()=> { saveLeaderboardEntry(); toast('Score saved to local leaderboard'); };
    document.getElementById('btn-share').onclick = shareSnapshot;
    document.getElementById('btn-prestige').onclick = ()=> { if(confirm('Prestige will reset progression for legacy points. Continue?')) doPrestige(); };
    setInterval(updateSeasonTimer,1000);
});

// ------------------ Missions / Achievement Checks ------------------
function checkMissions(){
    dayProgress.buyDifferent = Object.values(portfolio.stocks).filter(v=>v>0).length;
    dayProgress.trades = dayProgress.trades || 0;
    dayProgress.typesBought = dayProgress.typesBought || [];
    state.missions.forEach(m=>{
        if(m.done) return;
        if(m.id==='buy_3' && dayProgress.buyDifferent>=3) m.done=true;
        if(m.id==='profit_500' && (dayProgress.dayProfit||0) >=500) m.done=true;
        if(m.id==='hold_10' && (dayProgress.holdTicks||0) >=10) m.done=true;
        if(m.id==='trade_10' && (dayProgress.trades||0) >=10) m.done=true;
        if(m.id==='buy_food' && (dayProgress.typesBought||[]).includes('Food')) m.done=true;
    });
    renderMissionsModal();
}

// ------------------ Share Snapshot (Social) ------------------
function shareSnapshot(){
    const snapshot = { time: new Date().toISOString(), portfolioValue: getPortfolioValue(), cash: portfolio.cash, coins: state.coins, level: state.level };
    const txt = `Marketmasters snapshot: ${JSON.stringify(snapshot)}`;
    navigator.clipboard && navigator.clipboard.writeText(txt).then(()=> toast('Snapshot copied to clipboard!'), ()=> toast('Copy failed'));
}

// ------------------ Modals ------------------
function openModal(id){ const m = document.getElementById(id); if(m) m.setAttribute('aria-hidden','false'); }
function closeModal(id){ const m = document.getElementById(id); if(m) m.setAttribute('aria-hidden','true'); }

// ------------------ Utilities & End ------------------
function getPortfolioValue(){ let v = portfolio.cash; STOCKS.forEach(s=> v += (portfolio.stocks[s.symbol]||0) * (prices[s.symbol]||0)); return +v; }
function getSeasonId(){ const d=new Date(); const onejan=new Date(d.getFullYear(),0,1); const days=Math.floor((d-onejan)/(24*60*60*1000)); const week=Math.ceil((days+onejan.getDay()+1)/7); return `${d.getFullYear()}-W${week}`; }

// initial persistence save
saveState();
