// 1. Add cumulative profit tracking
let totalProfit = state.totalProfit || 0;

// 2. Add per-stock hold tick tracking for achievement
let holdTicks = state.holdTicks || {};

// PATCH: Update sellStock to increment totalProfit and unlock 'profit_1000'
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
    // PATCH: Track cumulative profit
    totalProfit += profit;
    state.totalProfit = totalProfit;
    if (totalProfit >= 1000 && !state.achievements['profit_1000']) {
      unlockAchievement('profit_1000');
    }
  }
  recordOrder('sell', symbol, qty, prices[symbol]);
  if (!state.achievements['first_trade']) unlockAchievement('first_trade');
  toast(`Sold ${qty} ${symbol} for ${formatCurrency(revenue)}`);
  saveState();
  updateHUD();
  updatePortfolioTable();
  updateTradeTable();
  updateStockTable();
};

// PATCH: Track hold ticks for each owned stock on every tick
function tickPrices() {
  setRandomPrices({});
  STOCKS.forEach(s => {
    const owned = (portfolio.stocks[s.symbol] || 0);
    if (owned > 0) {
      holdCounters[s.symbol] = (holdCounters[s.symbol] || 0) + 1;
      // PATCH: Track and unlock 'Patient Investor'
      holdTicks[s.symbol] = (holdTicks[s.symbol] || 0) + 1;
      state.holdTicks = holdTicks;
      if (holdTicks[s.symbol] >= 50 && !state.achievements['hold_50ticks']) {
        unlockAchievement('hold_50ticks');
      }
    }
    else {
      holdCounters[s.symbol] = 0;
      holdTicks[s.symbol] = 0;
    }
  });
  // ... (rest of tickPrices unchanged)
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

// PATCH: Guarantee 'Rising Star' achievement unlocks at level 10
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
    // PATCH: Unlock 'level_10' at level 10
    if (state.level >= 10 && !state.achievements['level_10']) {
      unlockAchievement('level_10');
    }
  }
  if (gained) saveState();
}

// (All other code unchanged, only these achievement patches added)