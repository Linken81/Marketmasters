// ---- Achievement Tracking Variables ----
if (!window.state) window.state = {};
if (!state.totalProfit) state.totalProfit = 0; // For 'Profit $1,000'
if (!state.stockHoldTicks) state.stockHoldTicks = {}; // For 'Patient Investor'

// ---- Your existing code ----

// --- PATCH: Achievement logic for buying and selling stocks ---

window.buyStock = function (symbol) {
  const input = document.getElementById(`buy_${symbol}`);
  let qty = input ? parseInt(input.value, 10) : 1;
  qty = Math.max(1, qty || 1);
  const cost = (prices[symbol] || 0) * qty;
  if (cost > portfolio.cash) { toast('Not enough cash'); return; }
  portfolio.cash -= cost;
  updateCash();
  portfolio.stocks[symbol] = (portfolio.stocks[symbol] || 0) + qty;

  // Track hold ticks for Patient Investor
  if (!state.stockHoldTicks[symbol]) state.stockHoldTicks[symbol] = 0;

  if (!dayProgress.typesBought) dayProgress.typesBought = [];
  const type = (STOCKS.find(s => s.symbol === symbol) || {}).type;
  if (type && !dayProgress.typesBought.includes(type)) dayProgress.typesBought.push(type);
  addXP(Math.max(1, Math.round(cost / 200)));
  state.coins += Math.max(0, Math.round(cost / 1000));
  recordOrder('buy', symbol, qty, prices[symbol]);

  // First Trade Achievement
  if (!state.achievements || !state.achievements['first_trade']) unlockAchievement('first_trade');

  toast(`Bought ${qty} ${symbol} for ${formatCurrency(cost)}`);
  saveState();
  updateHUD();
  updatePortfolioTable();
  updateTradeTable();
  updateStockTable();
  renderWatchlist();
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

  // PATCH: Track total profit for achievement
  if (profit > 0) {
    addXP(Math.round(profit / 10));
    state.coins += Math.round(profit / 50);
    dayProgress.dayProfit = (dayProgress.dayProfit || 0) + profit;

    state.totalProfit += profit; // Track total profit
    saveState();
    // Unlock profit_1000 achievement
    if (state.totalProfit >= 1000 && (!state.achievements || !state.achievements['profit_1000'])) {
      unlockAchievement('profit_1000');
    }
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

// PATCH: Track hold ticks for each stock on every tick
function tickStocks() {
  if (portfolio.stocks) {
    Object.keys(portfolio.stocks).forEach(symbol => {
      if (portfolio.stocks[symbol] > 0) {
        state.stockHoldTicks[symbol] = (state.stockHoldTicks[symbol] || 0) + 1;
        // Unlock Patient Investor achievement
        if (state.stockHoldTicks[symbol] >= 50 && (!state.achievements || !state.achievements['hold_50ticks'])) {
          unlockAchievement('hold_50ticks');
        }
      } else {
        state.stockHoldTicks[symbol] = 0;
      }
    });
  }
}

// Call tickStocks() at the appropriate place in your tick/update loop:
// setInterval(() => { tickStocks(); ... }, 1000); // or wherever your game tick logic runs

// PATCH: Guarantee Rising Star achievement unlocks at level 10
function addXP(amt) {
  if (!amt || amt < 0) return;
  state.xp = (state.xp || 0) + amt;
  let gained = false;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    gained = true;
    const rewardCoins = Math.round(60 + state.level * 12);
    state.coins += rewardCoins;
    toast(`Level up! Now level ${state.level}. +${rewardCoins} coins`);
    launchConfetti(60);
    unlockAchievement('level_up');
    if (state.level >= 10 && (!state.achievements || !state.achievements['level_10'])) {
      unlockAchievement('level_10');
    }
  }
  if (gained) saveState();
}

// Make sure ACHIEVEMENT_LIST and unlockAchievement are defined as before

// Optionally, ensure saveState is always called after achievement unlocks
function unlockAchievement(id) {
  if (!state.achievements) state.achievements = {};
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